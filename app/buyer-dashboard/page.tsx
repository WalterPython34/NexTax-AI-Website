"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { CATEGORIES } from "@/lib/marketview/categories";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── TYPES ───────────────────────────────────────────────────────────────────

type TabId       = "dashboard" | "my-deals" | "compare" | "market-intel";
type CompareMode = "my-deals" | "market" | "closed";
type DealStatus  = "New" | "Reviewing" | "Under LOI" | "Paused" | "Passed";
type SortKey     = "date" | "score" | "gap" | "asking";

interface DealRun {
  id: string;
  tool_used: string;
  industry: string;
  asking_price: number;
  fair_value: number;
  valuation_multiple: number;
  dscr: number;
  overall_score: number;
  risk_level: string;
  city: string | null;
  state: string | null;
  created_at: string;
  confidence_grade: string | null;
  red_flags?: string[];
  green_flags?: string[];
  revenue?: number;
  sde?: number;
  gap_pct?: number;
  signal?: "overpriced" | "fair" | "opportunity";
  verdict?: DealVerdict;
  oppScore?: number;
}

/** Deal Verdict — the single opinionated label shown throughout the UI */
type DealVerdict = "high_conviction" | "pursue" | "investigate" | "pass";

interface DealNote {
  id: string;
  deal_id: string;
  content: string;
  status_tag: string | null;
  created_at: string;
}

interface DealIntel {
  what_it_means: string;
  key_risks: string[];
  must_be_true: string[];
  suggested_approach: string;
  generated_at: string;
}

interface DriSnapshot {
  industry_key: string;
  dri: number;
  gap_pct: number;
  condition: string;
  deal_count: number;
  listing_multiple: number;
  snapshot_date: string;
}

interface TrendingMultiple {
  industry_key: string;
  median_multiple: number;
  sample_size: number;
}

interface Profile {
  id: string;
  email: string;
  plan: "free" | "pro" | "premium";
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const IL: Record<string, string> = {
  laundromat:      "Laundromat",
  hvac:            "HVAC",
  landscaping:     "Landscaping",
  carwash:         "Car Wash",
  dental:          "Dental Practice",
  gym:             "Gym / Fitness",
  restaurant:      "Restaurant",
  autorepair:      "Auto Repair",
  cleaning:        "Cleaning",
  ecommerce:       "Ecommerce",
  saas:            "SaaS",
  insurance:       "Insurance Agency",
  plumbing:        "Plumbing",
  roofing:         "Roofing",
  petcare:         "Pet Care",
  pharmacy:        "Pharmacy",
  daycare:         "Daycare",
  medspa:          "Med Spa",
  accounting:      "Accounting",
  electrical:      "Electrical",
  healthcare:      "Healthcare",
  transportation:  "Transportation",
  printing:        "Printing",
  storage:         "Self-Storage",
  painting:        "Painting",
  security:        "Security",
  construction:    "Construction",
  engineering:     "Engineering",
  grocery:         "Grocery",
  hairsalon:       "Hair Salon",
  marketing:       "Marketing Agency",
  pestcontrol:     "Pest Control",
  physicaltherapy: "Physical Therapy",
  propertymanage:  "Property Mgmt",
  realestatebrok:  "Real Estate Brok.",
  remodeling:      "Remodeling",
  seniorcare:      "Senior Care",
  signmaking:      "Sign Mfg.",
  staffing:        "Staffing",
  veterinary:      "Veterinary",
};

const STATUS_COLORS: Record<DealStatus, { color: string; bg: string; border: string }> = {
  "New":       { color: "#60A5FA", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.2)"  },
  "Reviewing": { color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.2)"  },
  "Under LOI": { color: "#10B981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.2)"  },
  "Paused":    { color: "#6B7280", bg: "rgba(107,114,128,0.1)", border: "rgba(107,114,128,0.2)" },
  "Passed":    { color: "#EF4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.2)"   },
};

const STATUS_OPTIONS: DealStatus[] = ["New", "Reviewing", "Under LOI", "Paused", "Passed"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function fmt(v: number) {
  if (!v && v !== 0) return "—";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function fmtFull(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(v);
}

function fmtTs(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function deriveSignal(g: number): "overpriced" | "fair" | "opportunity" {
  return g > 10 ? "overpriced" : g < -5 ? "opportunity" : "fair";
}

function sigCfg(s: string) {
  if (s === "overpriced")  return { color: "#D85A30", bg: "rgba(216,90,48,0.08)",  border: "rgba(216,90,48,0.18)",  label: "Overpriced",  dot: "#D85A30" };
  if (s === "opportunity") return { color: "#10B981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.18)", label: "Opportunity", dot: "#10B981" };
  return                          { color: "#3B82F6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.18)", label: "Fair Market",  dot: "#3B82F6" };
}

function scoreCol(s: number) {
  return s >= 70 ? "#10B981" : s >= 50 ? "#F59E0B" : "#EF4444";
}

function condSig(c: string): "overpriced" | "fair" | "opportunity" {
  const l = (c || "").toLowerCase();
  return l.includes("over") || l.includes("seller")  ? "overpriced"
       : l.includes("opport") || l.includes("buyer") || l.includes("under") ? "opportunity"
       : "fair";
}

function ago(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── COMPOSITE OPPORTUNITY SCORING ENGINE ────────────────────────────────────
//
// Opportunity Score = 40% Pricing Advantage
//                   + 30% DSCR Strength
//                   + 20% Deal Quality Score
//                   + 10% Risk Adjustment
//
// Score range: 0–100. Used for ranking in Top Opportunities.

/**
 * Pricing Advantage component (0–100).
 * Big negative gap (below market) = near 100. Overpriced = penalized toward 0.
 */
function pricingAdvantageScore(gapPct: number): number {
  // −30% gap → ~100, 0% gap → ~50, +20% gap → ~10
  if (gapPct <= -30) return 100;
  if (gapPct <= 0)   return 50 + (Math.abs(gapPct) / 30) * 50;
  if (gapPct <= 15)  return 50 - (gapPct / 15) * 35;
  return Math.max(0, 15 - (gapPct - 15) * 1.5);
}

/**
 * DSCR Strength component (0–100).
 * Capped at 3.0x — a 6x DSCR shouldn't automatically beat 2.5x if pricing is bad.
 */
function dscrStrengthScore(dscr: number): number {
  if (dscr < 1.0)  return Math.max(0, dscr * 15);
  if (dscr < 1.25) return 15 + (dscr - 1.0) / 0.25 * 25;
  if (dscr < 1.5)  return 40 + (dscr - 1.25) / 0.25 * 20;
  if (dscr < 2.5)  return 60 + (dscr - 1.5)  / 1.0  * 35;
  if (dscr < 3.0)  return 95 + (dscr - 2.5)  / 0.5  * 5;
  return 100; // Capped — diminishing returns above 3.0x
}

/**
 * Risk Adjustment component (0–100 → applied as multiplier).
 * Penalizes low DSCR, volatile industries, extreme assumptions.
 */
function riskAdjustmentScore(dscr: number, riskLevel: string, gapPct: number): number {
  let score = 80; // Base neutral
  // DSCR penalties
  if (dscr < 1.0)        score -= 40;
  else if (dscr < 1.25)  score -= 20;
  else if (dscr >= 1.75) score += 10;
  // Risk level from deal scoring
  const rl = (riskLevel || "").toLowerCase();
  if (rl === "critical") score -= 30;
  else if (rl === "high") score -= 15;
  else if (rl === "low")  score += 10;
  // Extreme overpricing penalty
  if (gapPct > 30) score -= 15;
  return Math.max(0, Math.min(100, score));
}

/**
 * Composite Opportunity Score (0–100).
 * Weighted: 40% pricing, 30% DSCR, 20% deal quality, 10% risk.
 */
function oppScore(d: DealRun): number {
  const gp = d.gap_pct ?? 0;
  const pricing = pricingAdvantageScore(gp);
  const dscr    = dscrStrengthScore(d.dscr);
  const quality = d.overall_score; // Already 0–100
  const risk    = riskAdjustmentScore(d.dscr, d.risk_level, gp);
  return Math.round(pricing * 0.40 + dscr * 0.30 + quality * 0.20 + risk * 0.10);
}

/**
 * Deal Verdict — the single opinionated label for a deal.
 *
 * 🔥 High Conviction: gap ≤ −30% AND DSCR ≥ 2.5 AND score ≥ 85 AND low risk
 * 🟢 Pursue:         (gap ≤ −20% AND DSCR ≥ 1.75 AND not high risk)
 *                    OR (score ≥ 80 AND gap ≤ −10%)
 * 🟡 Investigate:    −20% < gap < +15% AND DSCR ≥ 1.25
 * 🔴 Pass:           gap ≥ +15% OR DSCR < 1.25 OR risk == high/critical
 */
function dealVerdict(d: DealRun): DealVerdict {
  const gp = d.gap_pct ?? 0;
  const rl = (d.risk_level || "").toLowerCase();
  const isHighRisk = rl === "high" || rl === "critical";

  // 🔥 High Conviction
  if (gp <= -30 && d.dscr >= 2.5 && d.overall_score >= 85 && rl === "low") {
    return "high_conviction";
  }
  // 🔴 Pass — hard disqualifiers
  if (gp >= 15 || d.dscr < 1.25 || isHighRisk) {
    return "pass";
  }
  // 🟢 Pursue
  if ((gp <= -20 && d.dscr >= 1.75) || (d.overall_score >= 80 && gp <= -10)) {
    return "pursue";
  }
  // 🟡 Investigate (default for viable deals)
  return "investigate";
}

/** Verdict display config — emoji, label, colors */
function verdictCfg(v: DealVerdict) {
  switch (v) {
    case "high_conviction": return {
      emoji: "🔥", label: "High Conviction",
      color: "#F97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.25)",
      subtext: "Strong mispricing + durable DSCR. Priority deal to advance.",
    };
    case "pursue": return {
      emoji: "🟢", label: "Pursue",
      color: "#10B981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)",
      subtext: "Clearly underpriced, financeable, and not fragile. Move to diligence.",
    };
    case "investigate": return {
      emoji: "🟡", label: "Investigate",
      color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)",
      subtext: "Viable deal — not obviously mispriced. Needs diligence before advancing.",
    };
    case "pass": return {
      emoji: "🔴", label: "Pass",
      color: "#EF4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)",
      subtext: "Overpriced, risky, or structurally weak. Reprice or move on.",
    };
  }
}

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────

function Ring({ score, size = 36 }: { score: number; size?: number }) {
  const sw  = 3;
  const r   = (size - sw) / 2;
  const c   = r * 2 * Math.PI;
  const o   = c - (score / 100) * c;
  const col = scoreCol(score);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={col} strokeWidth={sw}
          strokeDasharray={c} strokeDashoffset={o}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center",
        fontSize: size * 0.28, fontWeight: 700, color: col,
        fontFamily: "'JetBrains Mono',monospace",
      }}>
        {score}
      </div>
    </div>
  );
}

function Skel({ w = "100%", h = 12 }: { w?: string | number; h?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 6,
      background: "rgba(255,255,255,0.05)",
      animation: "pulse 1.5s ease-in-out infinite",
    }} />
  );
}

function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
      <div>
        <h2 style={{
          fontSize: 15, fontWeight: 700, margin: "0 0 3px",
          fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.02em", color: "#F1F5F9",
        }}>
          {title}
        </h2>
        {sub && <p style={{ fontSize: 11, color: "#4B5563", margin: 0 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14, padding: "20px 22px", ...style,
    }}>
      {children}
    </div>
  );
}

function ProBadge() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 20,
      background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)",
      fontSize: 10, color: "#818CF8", fontWeight: 700,
      letterSpacing: "0.06em", textTransform: "uppercase" as const,
    }}>
      ⚡ PRO
    </span>
  );
}

function LockOverlay({ label = "Pro feature" }: { label?: string }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "rgba(8,12,19,0.7)", backdropFilter: "blur(4px)",
      borderRadius: 14, display: "flex", alignItems: "center",
      justifyContent: "center", flexDirection: "column", gap: 8, zIndex: 10,
    }}>
      <span style={{ fontSize: 20 }}>🔒</span>
      <span style={{ fontSize: 12, color: "#818CF8", fontWeight: 600 }}>{label}</span>
    </div>
  );
}

// ─── STAR BUTTON ─────────────────────────────────────────────────────────────

function StarButton({
  dealId, favorites, onToggle,
}: {
  dealId: string;
  favorites: Set<string>;
  onToggle: (id: string) => void;
}) {
  const isFav = favorites.has(dealId);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(dealId); }}
      title={isFav ? "Remove from watchlist" : "Add to watchlist"}
      style={{
        background: "none", border: "none", cursor: "pointer",
        padding: "4px 6px", borderRadius: 5,
        fontSize: 15, color: isFav ? "#F59E0B" : "#2D3748",
        transition: "color 0.15s", lineHeight: 1,
      }}
    >
      {isFav ? "★" : "☆"}
    </button>
  );
}

// ─── NOTES PANEL ─────────────────────────────────────────────────────────────

function NotesPanel({
  deal, userId, isPro, notes, intel,
  onClose, onNoteAdded, onNoteDeleted, onStatusChange, dealStatuses, onIntelGenerated,
}: {
  deal: DealRun;
  userId: string;
  isPro: boolean;
  notes: DealNote[];
  intel: DealIntel | null;
  onClose: () => void;
  onNoteAdded: (note: DealNote) => void;
  onNoteDeleted: (noteId: string) => void;
  onStatusChange: (id: string, status: DealStatus) => void;
  dealStatuses: Record<string, DealStatus>;
  onIntelGenerated: (intel: DealIntel) => void;
}) {
  const [noteText, setNoteText]     = useState("");
  const [noteTag, setNoteTag]       = useState<DealStatus | "">("");
  const [saving, setSaving]         = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingIntel, setLoadingIntel] = useState(false);

  const gp     = deal.gap_pct ?? 0;
  const status = dealStatuses[deal.id] ?? "New";

  const selStyle: React.CSSProperties = {
    padding: "5px 9px", borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.09)",
    background: "rgba(255,255,255,0.03)",
    color: "#94A3B8", fontSize: 11, outline: "none",
    cursor: "pointer", appearance: "none" as any,
  };

  async function handleSaveNote() {
    if (!noteText.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("deal_notes")
      .insert({
        user_id:    userId,
        deal_id:    deal.id,
        content:    noteText.trim(),
        status_tag: noteTag || null,
      })
      .select()
      .single();
    if (!error && data) {
      onNoteAdded(data as DealNote);
      setNoteText("");
      setNoteTag("");
    }
    setSaving(false);
  }

  async function handleDeleteNote(noteId: string) {
    await supabase.from("deal_notes").delete().eq("id", noteId).eq("user_id", userId);
    onNoteDeleted(noteId);
  }

  async function handleGenerateIntel(regenerate = false) {
    setLoadingIntel(true);
    try {
      const res = await fetch("/api/deal-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id:    userId,
          deal_id:    deal.id,
          regenerate,
          deal: {
            industry:            deal.industry,
            asking_price:        deal.asking_price,
            fair_value:          deal.fair_value,
            gap_pct:             deal.gap_pct,
            valuation_multiple:  deal.valuation_multiple,
            dscr:                deal.dscr,
            overall_score:       deal.overall_score,
            risk_level:          deal.risk_level,
            city:                deal.city,
            state:               deal.state,
            revenue:             deal.revenue,
            sde:                 deal.sde,
            red_flags:           deal.red_flags,
            green_flags:         deal.green_flags,
          },
        }),
      });
      const json = await res.json();
      if (json.success && json.intelligence) {
        onIntelGenerated(json.intelligence as DealIntel);
      }
    } catch (err) {
      console.error("Intel generation failed:", err);
    }
    setLoadingIntel(false);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 100, backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0,
        width: 440, height: "100vh",
        background: "#0D1117",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        zIndex: 101, display: "flex", flexDirection: "column",
        animation: "slideIn 0.22s ease-out",
        overflowY: "auto",
      }}>

        {/* Panel header */}
        <div style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{
                  fontSize: 14, fontWeight: 700, color: "#F1F5F9",
                  fontFamily: "'Inter Tight',sans-serif",
                }}>
                  {IL[deal.industry] || deal.industry}
                </span>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  padding: "2px 7px", borderRadius: 20,
                  fontSize: 10, fontWeight: 600,
                  background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: sc.dot }} />
                  {sc.label}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#4B5563" }}>
                {fmt(deal.asking_price)} · {deal.valuation_multiple.toFixed(2)}x · DSCR {deal.dscr.toFixed(2)} · Score {deal.overall_score}
                {gp !== 0 && (
                  <span style={{ color: gp > 0 ? "#D85A30" : "#10B981", marginLeft: 6, fontWeight: 600 }}>
                    {gp > 0 ? "+" : ""}{gp}% vs mkt
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none", color: "#4B5563",
                fontSize: 20, cursor: "pointer", padding: "2px 6px", lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* Status dropdown */}
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "#4B5563" }}>Status:</span>
            <select
              value={status}
              onChange={(e) => onStatusChange(deal.id, e.target.value as DealStatus)}
              style={{
                ...selStyle,
                color: STATUS_COLORS[status].color,
                background: STATUS_COLORS[status].bg,
                border: `1px solid ${STATUS_COLORS[status].border}`,
                fontWeight: 600,
              }}
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Add note */}
        <div style={{
          padding: "14px 20px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: "#4B5563",
            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8,
          }}>
            Add Note
          </div>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Observations, questions, next steps..."
            rows={3}
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "#E2E8F0", fontSize: 13,
              fontFamily: "'Inter',sans-serif",
              resize: "vertical" as any, outline: "none", lineHeight: 1.6,
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
            <select
              value={noteTag}
              onChange={(e) => setNoteTag(e.target.value as DealStatus | "")}
              style={{ ...selStyle, flex: 1 }}
            >
              <option value="">No tag</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={handleSaveNote}
              disabled={!noteText.trim() || saving}
              style={{
                padding: "7px 16px", borderRadius: 7, border: "none",
                background: noteText.trim() ? "linear-gradient(135deg,#3B82F6,#6366F1)" : "rgba(255,255,255,0.05)",
                color: noteText.trim() ? "#fff" : "#374151",
                fontSize: 12, fontWeight: 600,
                cursor: noteText.trim() && !saving ? "pointer" : "not-allowed",
              }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Notes list */}
        <div style={{ padding: "12px 20px", flex: 1, overflowY: "auto" }}>
          {notes.length > 0 && (
            <div style={{
              fontSize: 10, fontWeight: 600, color: "#374151",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10,
            }}>
              {notes.length} Note{notes.length !== 1 ? "s" : ""}
            </div>
          )}

          {loadingNotes ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Skel h={56} />
              <Skel h={56} />
            </div>
          ) : notes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#374151", fontSize: 12 }}>
              No notes yet. Add one above.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {notes.map(note => (
                <div
                  key={note.id}
                  style={{
                    padding: "11px 13px", borderRadius: 10,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: 6,
                  }}>
                    <span style={{ fontSize: 10, color: "#2D3748" }}>{fmtTs(note.created_at)}</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {note.status_tag && (
                        <span style={{
                          fontSize: 9, padding: "1px 6px", borderRadius: 20,
                          background: STATUS_COLORS[note.status_tag as DealStatus]?.bg ?? "rgba(255,255,255,0.05)",
                          color:      STATUS_COLORS[note.status_tag as DealStatus]?.color ?? "#6B7280",
                          border:    `1px solid ${STATUS_COLORS[note.status_tag as DealStatus]?.border ?? "rgba(255,255,255,0.1)"}`,
                          fontWeight: 600,
                        }}>
                          {note.status_tag}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        style={{
                          background: "none", border: "none", color: "#374151",
                          cursor: "pointer", fontSize: 11, padding: "0 2px",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#C9D1D9", lineHeight: 1.6 }}>
                    {note.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Deal Intelligence — Pro only */}
        {isPro && (
          <div style={{
            padding: "14px 20px 24px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{
                fontSize: 13, fontWeight: 700, color: "#F1F5F9",
                fontFamily: "'Inter Tight',sans-serif",
              }}>
                Deal Intelligence
              </span>
              <ProBadge />
            </div>

            {/* Empty state */}
            {!intel && !loadingIntel && (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{ fontSize: 12, color: "#4B5563", marginBottom: 14, lineHeight: 1.6 }}>
                  AI-generated analysis — risks, deal assumptions, and negotiation strategy.
                </div>
                <button
                  onClick={() => handleGenerateIntel(false)}
                  style={{
                    padding: "9px 20px", borderRadius: 9, border: "none",
                    background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
                    color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Generate Intelligence →
                </button>
              </div>
            )}

            {/* Loading state */}
            {loadingIntel && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Skel h={12} w="80%" />
                <Skel h={12} w="65%" />
                <Skel h={12} w="90%" />
                <Skel h={12} w="72%" />
                <div style={{ fontSize: 10, color: "#374151", textAlign: "center", marginTop: 4 }}>
                  Analyzing deal with AI...
                </div>
              </div>
            )}

            {/* Populated state */}
            {intel && !loadingIntel && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* What This Means */}
                <div>
                  <div style={{
                    fontSize: 10, color: "#6B7280", textTransform: "uppercase",
                    letterSpacing: "0.08em", fontWeight: 600, marginBottom: 5,
                  }}>
                    💡 What This Means
                  </div>
                  <div style={{ fontSize: 12, color: "#C9D1D9", lineHeight: 1.7 }}>
                    {intel.what_it_means}
                  </div>
                </div>

                {/* Key Risks */}
                <div>
                  <div style={{
                    fontSize: 10, color: "#6B7280", textTransform: "uppercase",
                    letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6,
                  }}>
                    ⚠️ Key Risks
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {intel.key_risks.map((risk, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ color: "#EF4444", fontSize: 9, flexShrink: 0, marginTop: 3 }}>⚠</span>
                        <span style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.5 }}>{risk}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* What Must Be True */}
                <div>
                  <div style={{
                    fontSize: 10, color: "#6B7280", textTransform: "uppercase",
                    letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6,
                  }}>
                    ✅ What Must Be True
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {intel.must_be_true.map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ color: "#10B981", fontSize: 9, flexShrink: 0, marginTop: 3 }}>✓</span>
                        <span style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.5 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Approach */}
                <div>
                  <div style={{
                    fontSize: 10, color: "#6B7280", textTransform: "uppercase",
                    letterSpacing: "0.08em", fontWeight: 600, marginBottom: 5,
                  }}>
                    🎯 Suggested Approach
                  </div>
                  <div style={{ fontSize: 12, color: "#C9D1D9", lineHeight: 1.7 }}>
                    {intel.suggested_approach}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button
                    onClick={() => handleGenerateIntel(true)}
                    disabled={loadingIntel}
                    style={{
                      flex: 1, padding: "7px", borderRadius: 7,
                      border: "1px solid rgba(99,102,241,0.2)",
                      background: "transparent", color: "#818CF8",
                      fontSize: 11, cursor: "pointer",
                    }}
                  >
                    ↺ Regenerate
                  </button>
                </div>
                <div style={{ fontSize: 10, color: "#2D3748", textAlign: "right" }}>
                  Generated {ago(intel.generated_at)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lock teaser for free users */}
        {!isPro && (
          <div style={{
            padding: "14px 20px 24px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}>
            <div style={{
              padding: "14px", borderRadius: 10,
              background: "rgba(99,102,241,0.04)",
              border: "1px solid rgba(99,102,241,0.12)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>⚡</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#818CF8", marginBottom: 4 }}>
                Deal Intelligence is a Pro feature
              </div>
              <div style={{ fontSize: 11, color: "#4B5563", marginBottom: 12 }}>
                Get AI-generated risks, assumptions, and negotiation strategy for every deal.
              </div>
              <button style={{
                padding: "7px 16px", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
                color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
                Upgrade to Pro
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── TOP OPPORTUNITIES ────────────────────────────────────────────────────────

function TopOpportunities({
  deals, favorites, isPro, onToggleFav, onOpenNotes, onOpenDetail, onOpenUnderwriting,
}: {
  deals: DealRun[];
  favorites: Set<string>;
  isPro: boolean;
  onToggleFav: (id: string) => void;
  onOpenNotes: (deal: DealRun) => void;
  onOpenDetail: (deal: DealRun) => void;
  onOpenUnderwriting: (deal: DealRun) => void;
}) {
  const top = [...deals]
    .filter(d => (d.gap_pct ?? 0) <= 0 || d.overall_score >= 65)
    .sort((a, b) => oppScore(b) - oppScore(a))
    .slice(0, 5);

  if (top.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <SectionHeader
        title="Top Opportunities"
        sub="Ranked by: pricing advantage, debt coverage, and risk-adjusted return"
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {top.map((deal, i) => {
          const gp  = deal.gap_pct ?? 0;
          const vd  = verdictCfg(deal.verdict ?? dealVerdict(deal));
          const isTop = i === 0;
          return (
            <div
              key={deal.id}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "13px 16px", borderRadius: 12,
                background: isTop ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.02)",
                border: isTop ? "1px solid rgba(16,185,129,0.15)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Rank badge */}
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: isTop ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700,
                color: isTop ? "#10B981" : "#4B5563",
                flexShrink: 0, fontFamily: "'JetBrains Mono',monospace",
              }}>
                {i + 1}
              </div>

              <Ring score={deal.overall_score} size={32} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#F1F5F9" }}>
                  {IL[deal.industry] || deal.industry}
                </div>
                <div style={{ fontSize: 11, color: "#4B5563", marginTop: 1 }}>
                  {fmt(deal.asking_price)} · {deal.valuation_multiple.toFixed(2)}x · DSCR {deal.dscr.toFixed(2)}
                </div>
              </div>

              {/* Gap */}
              <div style={{
                fontSize: 14, fontWeight: 700,
                color: gp <= 0 ? "#10B981" : "#D85A30",
                fontFamily: "'JetBrains Mono',monospace", flexShrink: 0,
              }}>
                {gp > 0 ? "+" : ""}{gp}%
              </div>

              {/* Verdict badge */}
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "4px 10px", borderRadius: 7,
                fontSize: 11, fontWeight: 700,
                background: vd.bg, color: vd.color, border: `1px solid ${vd.border}`,
                flexShrink: 0, whiteSpace: "nowrap" as any,
              }}>
                {vd.emoji} {vd.label}
              </span>

              {/* Actions */}
              <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "center" }}>
                <button
                  onClick={() => onOpenDetail(deal)}
                  style={{
                    padding: "5px 10px", borderRadius: 7, border: "none",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    color: "#6B7280", fontSize: 11, cursor: "pointer",
                  }}
                >
                  View
                </button>
                <StarButton dealId={deal.id} favorites={favorites} onToggle={onToggleFav} />
                <button
                  onClick={() => onOpenNotes(deal)}
                  title="Notes"
                  style={{
                    background: "none", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 7, cursor: "pointer", padding: "5px 8px",
                    fontSize: 12, color: "#4B5563",
                  }}
                >
                  📝
                </button>
                <button
                  onClick={() => onOpenUnderwriting(deal)}
                  title={isPro ? "Run Full Analysis" : "Pro feature"}
                  style={{
                    padding: "5px 10px", borderRadius: 7, border: "none",
                    border: isPro ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(255,255,255,0.05)",
                    background: isPro ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)",
                    color: isPro ? "#818CF8" : "#2D3748",
                    fontSize: 11, cursor: isPro ? "pointer" : "not-allowed",
                  }}
                >
                  {isPro ? "⚡ Full" : "🔒"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PRIORITY DEALS (dashboard watchlist section) ────────────────────────────

function PriorityDeals({
  deals, favorites, onOpenNotes, onOpenDetail,
}: {
  deals: DealRun[];
  favorites: Set<string>;
  onOpenNotes: (deal: DealRun) => void;
  onOpenDetail: (deal: DealRun) => void;
}) {
  const starred = deals.filter(d => favorites.has(d.id)).slice(0, 5);
  if (starred.length === 0) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <SectionHeader title="Priority Deals" sub="Your starred watchlist" />
      <Card>
        {starred.map((deal, i) => {
          const gp  = deal.gap_pct ?? 0;
          const vd  = verdictCfg(deal.verdict ?? dealVerdict(deal));
          return (
            <div
              key={deal.id}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 0",
                borderBottom: i < starred.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}
            >
              <span style={{ fontSize: 14, color: "#F59E0B" }}>★</span>
              <Ring score={deal.overall_score} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>
                  {IL[deal.industry] || deal.industry}
                </div>
                <div style={{ fontSize: 11, color: "#374151" }}>
                  {fmt(deal.asking_price)} · {deal.valuation_multiple.toFixed(2)}x
                </div>
              </div>
              <div style={{
                fontSize: 12, fontWeight: 700,
                color: gp > 0 ? "#D85A30" : "#10B981",
                fontFamily: "'JetBrains Mono',monospace",
              }}>
                {gp > 0 ? "+" : ""}{gp}%
              </div>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "2px 8px", borderRadius: 6,
                fontSize: 10, fontWeight: 700,
                background: vd.bg, color: vd.color, border: `1px solid ${vd.border}`,
                whiteSpace: "nowrap" as any,
              }}>
                {vd.emoji} {vd.label}
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => onOpenDetail(deal)}
                  style={{
                    padding: "4px 9px", borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    color: "#6B7280", fontSize: 11, cursor: "pointer",
                  }}
                >
                  View
                </button>
                <button
                  onClick={() => onOpenNotes(deal)}
                  style={{
                    padding: "4px 8px", borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    color: "#4B5563", fontSize: 11, cursor: "pointer",
                  }}
                >
                  📝
                </button>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}


// ─── SCORING ENGINE (shared by AnalyzeDealModal) ─────────────────────────────

const SCORE_INDUSTRIES: Record<string, {
  label: string; benchmarkLow: number; benchmarkMid: number; benchmarkHigh: number;
  marginRange: [number, number]; growth: string; riskFactor: number;
  demandScore: number; buyerInterestRank: number; competitionLevel: string;
}> = {
  laundromat:     { label:"Laundromat",           benchmarkLow:2.8, benchmarkMid:3.48, benchmarkHigh:4.4,  marginRange:[25,40], growth:"Stable",   riskFactor:0.85, demandScore:82, buyerInterestRank:3,  competitionLevel:"Moderate"      },
  hvac:           { label:"HVAC",                 benchmarkLow:1.8, benchmarkMid:2.45, benchmarkHigh:3.2,  marginRange:[15,30], growth:"Growing",  riskFactor:0.75, demandScore:88, buyerInterestRank:2,  competitionLevel:"Low-Moderate"  },
  landscaping:    { label:"Landscaping",          benchmarkLow:1.7, benchmarkMid:2.21, benchmarkHigh:2.9,  marginRange:[10,25], growth:"Stable",   riskFactor:0.90, demandScore:70, buyerInterestRank:7,  competitionLevel:"High"          },
  carwash:        { label:"Car Wash",             benchmarkLow:2.0, benchmarkMid:2.74, benchmarkHigh:3.6,  marginRange:[25,45], growth:"Growing",  riskFactor:0.80, demandScore:79, buyerInterestRank:5,  competitionLevel:"Moderate"      },
  dental:         { label:"Dental Practice",      benchmarkLow:0.8, benchmarkMid:1.30, benchmarkHigh:1.9,  marginRange:[20,40], growth:"Growing",  riskFactor:0.65, demandScore:74, buyerInterestRank:8,  competitionLevel:"Low"           },
  gym:            { label:"Gym / Fitness",        benchmarkLow:1.8, benchmarkMid:2.32, benchmarkHigh:3.0,  marginRange:[15,35], growth:"Stable",   riskFactor:0.95, demandScore:71, buyerInterestRank:9,  competitionLevel:"Moderate-High" },
  restaurant:     { label:"Restaurant",           benchmarkLow:1.4, benchmarkMid:1.85, benchmarkHigh:2.4,  marginRange:[5,15],  growth:"Volatile", riskFactor:1.10, demandScore:65, buyerInterestRank:11, competitionLevel:"Very High"     },
  autorepair:     { label:"Auto Repair",          benchmarkLow:1.6, benchmarkMid:2.11, benchmarkHigh:2.8,  marginRange:[15,30], growth:"Stable",   riskFactor:0.85, demandScore:73, buyerInterestRank:6,  competitionLevel:"Moderate"      },
  cleaning:       { label:"Cleaning Service",     benchmarkLow:1.8, benchmarkMid:2.22, benchmarkHigh:2.9,  marginRange:[15,30], growth:"Growing",  riskFactor:0.80, demandScore:76, buyerInterestRank:4,  competitionLevel:"High"          },
  ecommerce:      { label:"Ecommerce Brand",      benchmarkLow:1.9, benchmarkMid:2.41, benchmarkHigh:3.1,  marginRange:[15,35], growth:"Variable", riskFactor:0.95, demandScore:83, buyerInterestRank:1,  competitionLevel:"Very High"     },
  saas:           { label:"SaaS Product",         benchmarkLow:2.1, benchmarkMid:2.60, benchmarkHigh:3.4,  marginRange:[60,85], growth:"Growing",  riskFactor:0.70, demandScore:91, buyerInterestRank:1,  competitionLevel:"High"          },
  insurance:      { label:"Insurance Agency",     benchmarkLow:1.4, benchmarkMid:1.82, benchmarkHigh:2.4,  marginRange:[20,40], growth:"Stable",   riskFactor:0.70, demandScore:68, buyerInterestRank:10, competitionLevel:"Low"           },
  plumbing:       { label:"Plumbing",             benchmarkLow:1.7, benchmarkMid:2.30, benchmarkHigh:3.0,  marginRange:[15,30], growth:"Growing",  riskFactor:0.75, demandScore:85, buyerInterestRank:3,  competitionLevel:"Low-Moderate"  },
  roofing:        { label:"Roofing",              benchmarkLow:1.7, benchmarkMid:2.21, benchmarkHigh:2.9,  marginRange:[15,30], growth:"Stable",   riskFactor:0.90, demandScore:72, buyerInterestRank:6,  competitionLevel:"Moderate"      },
  petcare:        { label:"Pet Care / Grooming",  benchmarkLow:2.0, benchmarkMid:2.46, benchmarkHigh:3.2,  marginRange:[20,40], growth:"Growing",  riskFactor:0.80, demandScore:77, buyerInterestRank:5,  competitionLevel:"Moderate"      },
  pharmacy:       { label:"Pharmacy",             benchmarkLow:0.5, benchmarkMid:0.66, benchmarkHigh:0.9,  marginRange:[18,30], growth:"Stable",   riskFactor:0.75, demandScore:62, buyerInterestRank:14, competitionLevel:"Low"           },
  daycare:        { label:"Daycare / Childcare",  benchmarkLow:1.9, benchmarkMid:2.29, benchmarkHigh:3.0,  marginRange:[15,30], growth:"Growing",  riskFactor:0.80, demandScore:74, buyerInterestRank:10, competitionLevel:"Moderate"      },
  medspa:         { label:"Med Spa",              benchmarkLow:2.0, benchmarkMid:2.75, benchmarkHigh:3.6,  marginRange:[25,45], growth:"Growing",  riskFactor:0.75, demandScore:80, buyerInterestRank:7,  competitionLevel:"Moderate"      },
  accounting:     { label:"Accounting / Tax",     benchmarkLow:1.0, benchmarkMid:1.30, benchmarkHigh:1.7,  marginRange:[30,55], growth:"Stable",   riskFactor:0.60, demandScore:86, buyerInterestRank:3,  competitionLevel:"Low-Moderate"  },
  electrical:     { label:"Electrical",           benchmarkLow:1.7, benchmarkMid:2.30, benchmarkHigh:3.0,  marginRange:[15,30], growth:"Growing",  riskFactor:0.75, demandScore:84, buyerInterestRank:3,  competitionLevel:"Low-Moderate"  },
  healthcare:     { label:"Healthcare",           benchmarkLow:1.8, benchmarkMid:2.50, benchmarkHigh:3.3,  marginRange:[10,25], growth:"Growing",  riskFactor:0.70, demandScore:80, buyerInterestRank:4,  competitionLevel:"Moderate"      },
  transportation: { label:"Transportation",       benchmarkLow:1.5, benchmarkMid:2.10, benchmarkHigh:2.8,  marginRange:[10,20], growth:"Stable",   riskFactor:0.90, demandScore:68, buyerInterestRank:8,  competitionLevel:"Moderate"      },
  printing:       { label:"Printing / Signage",   benchmarkLow:1.5, benchmarkMid:2.00, benchmarkHigh:2.7,  marginRange:[15,30], growth:"Stable",   riskFactor:0.85, demandScore:60, buyerInterestRank:12, competitionLevel:"Moderate"      },
  storage:        { label:"Self-Storage",         benchmarkLow:2.5, benchmarkMid:3.20, benchmarkHigh:4.2,  marginRange:[35,55], growth:"Growing",  riskFactor:0.70, demandScore:85, buyerInterestRank:2,  competitionLevel:"Low-Moderate"  },
  painting:       { label:"Painting",             benchmarkLow:1.5, benchmarkMid:2.10, benchmarkHigh:2.8,  marginRange:[15,30], growth:"Stable",   riskFactor:0.85, demandScore:68, buyerInterestRank:8,  competitionLevel:"High"          },
  security:       { label:"Security Services",    benchmarkLow:1.8, benchmarkMid:2.40, benchmarkHigh:3.2,  marginRange:[15,30], growth:"Growing",  riskFactor:0.75, demandScore:74, buyerInterestRank:6,  competitionLevel:"Moderate"      },
  construction:   { label:"Construction",         benchmarkLow:1.5, benchmarkMid:2.10, benchmarkHigh:2.8,  marginRange:[10,20], growth:"Growing",  riskFactor:0.90, demandScore:75, buyerInterestRank:5,  competitionLevel:"High"          },
  engineering:    { label:"Engineering",          benchmarkLow:1.8, benchmarkMid:2.50, benchmarkHigh:3.3,  marginRange:[20,40], growth:"Stable",   riskFactor:0.65, demandScore:72, buyerInterestRank:7,  competitionLevel:"Low"           },
  grocery:        { label:"Grocery",              benchmarkLow:0.8, benchmarkMid:1.10, benchmarkHigh:1.5,  marginRange:[2,8],   growth:"Stable",   riskFactor:0.90, demandScore:60, buyerInterestRank:13, competitionLevel:"Very High"     },
  propertymanage: { label:"Property Management",  benchmarkLow:2.0, benchmarkMid:2.80, benchmarkHigh:3.7,  marginRange:[20,40], growth:"Growing",  riskFactor:0.70, demandScore:78, buyerInterestRank:4,  competitionLevel:"Moderate"      },
  realestatebrok: { label:"Real Estate Brok.",    benchmarkLow:1.5, benchmarkMid:2.10, benchmarkHigh:2.8,  marginRange:[20,40], growth:"Growing",  riskFactor:0.75, demandScore:72, buyerInterestRank:6,  competitionLevel:"Moderate"      },
  remodeling:     { label:"Remodeling",           benchmarkLow:1.5, benchmarkMid:2.10, benchmarkHigh:2.8,  marginRange:[12,25], growth:"Growing",  riskFactor:0.85, demandScore:74, buyerInterestRank:5,  competitionLevel:"High"          },
  seniorcare:     { label:"Senior Care",          benchmarkLow:2.0, benchmarkMid:2.80, benchmarkHigh:3.7,  marginRange:[15,30], growth:"Growing",  riskFactor:0.70, demandScore:82, buyerInterestRank:3,  competitionLevel:"Moderate"      },
  staffing:       { label:"Staffing Agency",      benchmarkLow:1.2, benchmarkMid:1.70, benchmarkHigh:2.3,  marginRange:[5,15],  growth:"Stable",   riskFactor:0.80, demandScore:70, buyerInterestRank:7,  competitionLevel:"Moderate-High" },
  veterinary:     { label:"Veterinary Practice",  benchmarkLow:1.5, benchmarkMid:2.10, benchmarkHigh:2.9,  marginRange:[15,30], growth:"Growing",  riskFactor:0.70, demandScore:78, buyerInterestRank:5,  competitionLevel:"Moderate"      },
  marketing:      { label:"Marketing Agency",     benchmarkLow:1.5, benchmarkMid:2.20, benchmarkHigh:3.0,  marginRange:[20,40], growth:"Growing",  riskFactor:0.80, demandScore:72, buyerInterestRank:6,  competitionLevel:"High"          },
  pestcontrol:    { label:"Pest Control",         benchmarkLow:1.8, benchmarkMid:2.50, benchmarkHigh:3.3,  marginRange:[20,35], growth:"Stable",   riskFactor:0.75, demandScore:76, buyerInterestRank:5,  competitionLevel:"Moderate"      },
  physicaltherapy:{ label:"Physical Therapy",     benchmarkLow:1.5, benchmarkMid:2.10, benchmarkHigh:2.8,  marginRange:[15,30], growth:"Stable",   riskFactor:0.70, demandScore:74, buyerInterestRank:6,  competitionLevel:"Low-Moderate"  },
  signmaking:     { label:"Sign Mfg.",            benchmarkLow:1.5, benchmarkMid:2.00, benchmarkHigh:2.7,  marginRange:[15,30], growth:"Stable",   riskFactor:0.85, demandScore:60, buyerInterestRank:12, competitionLevel:"Moderate"      },
  hairsalon:      { label:"Hair Salon",           benchmarkLow:0.8, benchmarkMid:1.20, benchmarkHigh:1.8,  marginRange:[15,35], growth:"Stable",   riskFactor:0.90, demandScore:65, buyerInterestRank:10, competitionLevel:"High"          },
};

interface ModalDealInputs {
  industry: string;
  revenue: string;
  sde: string;
  askingPrice: string;
  city: string;
  state: string;
  debtPercent: string;
  interestRate: string;
  termYears: string;
}

interface ModalScore {
  overall: number;
  riskLevel: "Low" | "Moderate" | "High" | "Critical";
  fairValue: number;
  fairValueLow: number;
  fairValueHigh: number;
  multiple: number;
  dscr: number;
  monthlyPayment: number;
  gap_pct: number;
  signal: "overpriced" | "fair" | "opportunity";
  recommendedOfferLow: number;
  recommendedOfferHigh: number;
  redFlags: string[];
  greenFlags: string[];
  valuationScore: number;
  debtScore: number;
  marketScore: number;
  industryScore: number;
}

function computeModalScore(inputs: ModalDealInputs): ModalScore | null {
  const revenue = parseFloat(inputs.revenue.replace(/,/g, ""));
  const sde     = parseFloat(inputs.sde.replace(/,/g, ""));
  const price   = parseFloat(inputs.askingPrice.replace(/,/g, ""));
  const debtPct = parseFloat(inputs.debtPercent) / 100;
  const rate    = parseFloat(inputs.interestRate) / 100;
  const term    = parseFloat(inputs.termYears);
  const ind     = SCORE_INDUSTRIES[inputs.industry];
  if (!revenue || !sde || !price || !ind || isNaN(debtPct) || isNaN(rate) || isNaN(term)) return null;

  const redFlags: string[]   = [];
  const greenFlags: string[] = [];
  const multiple             = price / sde;
  const { benchmarkLow, benchmarkMid, benchmarkHigh } = ind;

  const fairValueLow  = Math.round(sde * benchmarkLow);
  const fairValue     = Math.round(sde * benchmarkMid);
  const fairValueHigh = Math.round(sde * benchmarkHigh);

  // Valuation score
  let valuationScore: number;
  if (multiple <= benchmarkLow * 0.85)    valuationScore = Math.min(95, 85 + (benchmarkLow - multiple) / benchmarkLow * 20);
  else if (multiple <= benchmarkMid)       valuationScore = Math.min(90, 70 + (benchmarkMid - multiple) / benchmarkMid * 40);
  else if (multiple <= benchmarkHigh)      valuationScore = 70 - ((multiple - benchmarkMid) / (benchmarkHigh - benchmarkMid)) * 25;
  else                                     valuationScore = Math.max(5, 40 - ((multiple - benchmarkHigh) / benchmarkHigh) * 60);
  valuationScore = Math.round(Math.max(5, Math.min(98, valuationScore)));

  // Recommended offer
  let recommendedOfferLow: number, recommendedOfferHigh: number;
  if (price <= fairValueLow)       { recommendedOfferLow = Math.round(price * 0.80); recommendedOfferHigh = Math.round(price * 1.0); }
  else if (price <= fairValue)     { recommendedOfferLow = Math.round(price * 0.85); recommendedOfferHigh = Math.round(price * 1.0); }
  else if (price <= fairValueHigh) { recommendedOfferLow = Math.round(fairValue * 0.90); recommendedOfferHigh = fairValue; }
  else                             { recommendedOfferLow = fairValueLow; recommendedOfferHigh = fairValue; }

  const sdeMargin = (sde / revenue) * 100;
  if (multiple > benchmarkHigh) redFlags.push(`Asking multiple of ${multiple.toFixed(2)}x is above the ${benchmarkHigh.toFixed(2)}x high end of observed ${ind.label} transactions`);
  else if (multiple < benchmarkLow) greenFlags.push(`Asking multiple of ${multiple.toFixed(2)}x is below the ${benchmarkLow.toFixed(2)}x market low end — favorable pricing`);
  else greenFlags.push(`${multiple.toFixed(2)}x is within the ${benchmarkLow.toFixed(2)}–${benchmarkHigh.toFixed(2)}x observed range`);
  if (sdeMargin < ind.marginRange[0]) redFlags.push(`SDE margin of ${sdeMargin.toFixed(0)}% is below the ${ind.marginRange[0]}–${ind.marginRange[1]}% typical range`);

  // DSCR
  const loanAmount   = price * debtPct;
  const monthlyRate  = rate / 12;
  const numPayments  = term * 12;
  const monthlyPayment = monthlyRate > 0
    ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
    : loanAmount / numPayments;
  const annualPayment = monthlyPayment * 12;
  const dscr = annualPayment > 0 ? +(sde / annualPayment).toFixed(2) : 99;

  let debtScore: number;
  if (dscr >= 2.0)       debtScore = 92;
  else if (dscr >= 1.5)  debtScore = 75 + (dscr - 1.5) * 34;
  else if (dscr >= 1.25) debtScore = 55 + (dscr - 1.25) * 80;
  else if (dscr >= 1.0)  debtScore = 30 + (dscr - 1.0) * 100;
  else                   debtScore = Math.max(5, dscr * 30);
  debtScore = Math.round(Math.max(5, Math.min(98, debtScore)));

  if (dscr < 1.25) redFlags.push(`DSCR of ${dscr.toFixed(2)}x is below the 1.25x lender minimum`);
  else if (dscr >= 1.5) greenFlags.push(`DSCR of ${dscr.toFixed(2)}x is well above lender minimums`);

  const growthScores: Record<string, number> = { Growing: 80, Stable: 65, Variable: 45, Volatile: 30 };
  const marketScore = growthScores[ind.growth] || 50;
  if (ind.growth === "Volatile") redFlags.push(`${ind.label} has historically volatile demand`);
  if (ind.growth === "Growing")  greenFlags.push(`${ind.label} shows favorable growth indicators`);

  let industryScore = Math.round(Math.max(15, Math.min(95, (1 - ind.riskFactor) * 100 + 40)));
  if (sdeMargin < ind.marginRange[0]) industryScore -= 8;
  industryScore = Math.round(Math.max(10, Math.min(95, industryScore)));

  const overall = Math.round(Math.max(5, Math.min(98,
    valuationScore * 0.30 + debtScore * 0.30 + marketScore * 0.20 + industryScore * 0.20
  )));
  const riskLevel = overall >= 70 ? "Low" : overall >= 50 ? "Moderate" : overall >= 30 ? "High" : "Critical";

  const gap_pct = fairValue > 0 ? Math.round(((price - fairValue) / fairValue) * 100) : 0;
  const signal: "overpriced" | "fair" | "opportunity" =
    gap_pct > 10 ? "overpriced" : gap_pct < -5 ? "opportunity" : "fair";

  return {
    overall, riskLevel, fairValue, fairValueLow, fairValueHigh, multiple,
    dscr, monthlyPayment, gap_pct, signal,
    recommendedOfferLow, recommendedOfferHigh,
    redFlags, greenFlags,
    valuationScore, debtScore, marketScore, industryScore,
  };
}

// ─── ANALYZE DEAL MODAL ───────────────────────────────────────────────────────

function AnalyzeDealModal({
  userId, isPro, onClose, onDealSaved,
}: {
  userId: string;
  isPro: boolean;
  onClose: () => void;
  onDealSaved: (deal: DealRun) => void;
}) {
  const [step, setStep] = useState<"input" | "results">("input");
  const [inputs, setInputs] = useState<ModalDealInputs>({
    industry: "", revenue: "", sde: "", askingPrice: "",
    city: "", state: "",
    debtPercent: "80", interestRate: "10.5", termYears: "10",
  });
  const [score, setScore]     = useState<ModalScore | null>(null);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof ModalDealInputs, v: string) => setInputs(p => ({ ...p, [k]: v }));
  const setCurr = (k: keyof ModalDealInputs, v: string) => {
    const n = v.replace(/[^0-9]/g, "");
    set(k, n ? parseInt(n).toLocaleString() : "");
  };

  const canScore = inputs.industry && inputs.revenue && inputs.sde && inputs.askingPrice;

  function handleScore() {
    setLoading(true);
    const result = computeModalScore(inputs);
    setTimeout(() => { setScore(result); setStep("results"); setLoading(false); }, 300);
  }

  async function handleSave() {
    if (!score) return;
    setSaving(true);
    setSaveError("");
    try {
      const rev   = parseFloat(inputs.revenue.replace(/,/g, ""));
      const sde   = parseFloat(inputs.sde.replace(/,/g, ""));
      const price = parseFloat(inputs.askingPrice.replace(/,/g, ""));
      const res = await fetch("/api/record-deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool_used:            "dashboard_modal",
          industry:             inputs.industry,
          revenue:              rev,
          sde,
          asking_price:         price,
          city:                 inputs.city || null,
          state:                inputs.state || null,
          debt_percent:         parseFloat(inputs.debtPercent),
          interest_rate:        parseFloat(inputs.interestRate),
          term_years:           parseFloat(inputs.termYears),
          valuation_multiple:   +score.multiple.toFixed(2),
          dscr:                 score.dscr,
          monthly_payment:      Math.round(score.monthlyPayment),
          fair_value:           score.fairValue,
          recommended_offer_low:  score.recommendedOfferLow,
          recommended_offer_high: score.recommendedOfferHigh,
          overall_score:        score.overall,
          risk_level:           score.riskLevel,
          valuation_score:      score.valuationScore,
          debt_score:           score.debtScore,
          market_score:         score.marketScore,
          industry_score:       score.industryScore,
          red_flags:            score.redFlags,
          green_flags:          score.greenFlags,
          user_id:              userId,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");
      if (json.deal) {
        onDealSaved(json.deal as DealRun);
        setSaved(true);
      }
    } catch (err) {
      setSaveError((err as Error).message);
    }
    setSaving(false);
  }

  const sigCfgM = (s: string) => {
    if (s === "overpriced")  return { color: "#D85A30", bg: "rgba(216,90,48,0.1)",  label: "Overpriced"  };
    if (s === "opportunity") return { color: "#10B981", bg: "rgba(16,185,129,0.1)", label: "Opportunity" };
    return                          { color: "#3B82F6", bg: "rgba(59,130,246,0.1)", label: "Fair Market"  };
  };

  const scoreColor = (s: number) => s >= 70 ? "#10B981" : s >= 50 ? "#F59E0B" : s >= 30 ? "#F97316" : "#EF4444";

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.09)",
    background: "rgba(255,255,255,0.03)",
    color: "#E2E8F0", fontSize: 13, outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 10, color: "#4B5563",
    textTransform: "uppercase", letterSpacing: "0.08em",
    fontWeight: 600, marginBottom: 5,
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, backdropFilter: "blur(3px)" }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: "min(680px, 96vw)", maxHeight: "90vh",
        background: "#0D1117",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16, zIndex: 201,
        display: "flex", flexDirection: "column",
        animation: "fadeUp 0.2s ease-out",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 24px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter Tight',sans-serif" }}>
              {step === "input" ? "Analyze a Deal" : "Deal Analysis Results"}
            </div>
            <div style={{ fontSize: 11, color: "#4B5563", marginTop: 2 }}>
              {step === "input" ? "Enter deal details to score and save" : "Review score, then save to your dashboard"}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#4B5563", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "2px 6px" }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1 }}>

          {/* ── STEP 1: INPUT ── */}
          {step === "input" && (
            <div style={{ padding: "20px 24px" }}>
              {/* Industry */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Industry</label>
                <select
                  value={inputs.industry}
                  onChange={e => set("industry", e.target.value)}
                  style={{ ...inputStyle, appearance: "none" as any, cursor: "pointer" }}
                >
                  <option value="">Select industry...</option>
                  {Object.entries(SCORE_INDUSTRIES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              {/* Financial inputs */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                {([
                  { k: "revenue" as const,     label: "Annual Revenue ($)" },
                  { k: "sde" as const,          label: "SDE / Cash Flow ($)" },
                  { k: "askingPrice" as const,  label: "Asking Price ($)" },
                ] as { k: keyof ModalDealInputs; label: string }[]).map(({ k, label }) => (
                  <div key={k}>
                    <label style={labelStyle}>{label}</label>
                    <input
                      type="text" inputMode="numeric" placeholder="0"
                      value={inputs[k]}
                      onChange={e => setCurr(k, e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>

              {/* Location */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>City (optional)</label>
                  <input type="text" placeholder="e.g. Tampa" value={inputs.city} onChange={e => set("city", e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>State (optional)</label>
                  <input type="text" placeholder="e.g. FL" maxLength={2} value={inputs.state} onChange={e => set("state", e.target.value.toUpperCase())} style={inputStyle} />
                </div>
              </div>

              {/* Debt terms */}
              <div style={{
                padding: "12px 14px", borderRadius: 10, marginBottom: 18,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>
                  Debt Terms (for DSCR)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {([
                    { k: "debtPercent" as const,  label: "Debt %",   placeholder: "80" },
                    { k: "interestRate" as const,  label: "Rate %",   placeholder: "10.5" },
                    { k: "termYears" as const,     label: "Term (yr)", placeholder: "10" },
                  ] as { k: keyof ModalDealInputs; label: string; placeholder: string }[]).map(({ k, label, placeholder }) => (
                    <div key={k}>
                      <label style={labelStyle}>{label}</label>
                      <input
                        type="number" placeholder={placeholder}
                        value={inputs[k]}
                        onChange={e => set(k, e.target.value)}
                        style={{ ...inputStyle, fontFamily: "'JetBrains Mono',monospace" }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleScore}
                disabled={!canScore || loading}
                style={{
                  width: "100%", padding: "12px", borderRadius: 10, border: "none",
                  background: canScore ? "linear-gradient(135deg,#3B82F6,#6366F1)" : "rgba(255,255,255,0.05)",
                  color: canScore ? "#fff" : "#374151",
                  fontSize: 14, fontWeight: 600, cursor: canScore ? "pointer" : "not-allowed",
                }}
              >
                {loading ? "Scoring..." : "Score This Deal →"}
              </button>
            </div>
          )}

          {/* ── STEP 2: RESULTS ── */}
          {step === "results" && score && (
            <div style={{ padding: "20px 24px" }}>

              {/* Hero row */}
              <div style={{
                display: "grid", gridTemplateColumns: "auto 1fr", gap: 20,
                padding: "16px 18px", borderRadius: 12, marginBottom: 16,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
                alignItems: "center",
              }}>
                {/* Score ring */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ position: "relative", width: 80, height: 80 }}>
                    <svg width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                      <circle cx="40" cy="40" r="34" fill="none"
                        stroke={scoreColor(score.overall)} strokeWidth="6"
                        strokeDasharray={`${2 * Math.PI * 34}`}
                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - score.overall / 100)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div style={{
                      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor(score.overall), fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{score.overall}</span>
                      <span style={{ fontSize: 9, color: "#4B5563", marginTop: 1 }}>/ 100</span>
                    </div>
                  </div>
                  <div style={{
                    marginTop: 6, fontSize: 10, fontWeight: 700, color: scoreColor(score.overall),
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    {score.riskLevel} Risk
                  </div>
                </div>

                {/* Key metrics */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Fair Value",    value: fmt(score.fairValue),           color: "#10B981" },
                    { label: "Multiple",      value: score.multiple.toFixed(2) + "x", color: "#E2E8F0" },
                    { label: "DSCR",          value: score.dscr.toFixed(2) + "x",   color: score.dscr >= 1.25 ? "#10B981" : "#F97316" },
                    { label: "Gap vs Market", value: (score.gap_pct > 0 ? "+" : "") + score.gap_pct + "%", color: score.gap_pct > 0 ? "#D85A30" : "#10B981" },
                    { label: "Offer Low",     value: fmt(score.recommendedOfferLow), color: "#818CF8" },
                    { label: "Offer High",    value: fmt(score.recommendedOfferHigh),color: "#818CF8" },
                  ].map(m => (
                    <div key={m.label} style={{ textAlign: "center", padding: "8px 6px", borderRadius: 8, background: "rgba(255,255,255,0.02)" }}>
                      <div style={{ fontSize: 9, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{m.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono',monospace" }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verdict + fair value range */}
              {(() => {
                const dForV = { gap_pct: score.gap_pct, dscr: score.dscr, overall_score: score.overall, risk_level: score.riskLevel } as DealRun;
                const vdm = verdictCfg(dealVerdict(dForV));
                return (
                  <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                    <div style={{
                      flex: 1, padding: "10px 14px", borderRadius: 10,
                      background: vdm.bg, border: `1px solid ${vdm.border}`,
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <span style={{ fontSize: 20 }}>{vdm.emoji}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: vdm.color, textTransform: "uppercase" as any, letterSpacing: "0.06em" }}>
                          Verdict: {vdm.label}
                        </div>
                        <div style={{ fontSize: 10, color: "#6B7280", marginTop: 1, lineHeight: 1.4 }}>{vdm.subtext}</div>
                        <div style={{ fontSize: 10, color: "#4B5563", marginTop: 3 }}>
                          FV Range: {fmt(score.fairValueLow)} – {fmt(score.fairValueHigh)}
                        </div>
                      </div>
                    </div>
                    {/* Sub-score pills */}
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {[
                        { label: "Val", value: score.valuationScore },
                        { label: "Debt", value: score.debtScore },
                        { label: "Mkt", value: score.marketScore },
                        { label: "Ind", value: score.industryScore },
                      ].map(s => (
                        <div key={s.label} style={{ textAlign: "center", padding: "6px 8px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", minWidth: 42 }}>
                          <div style={{ fontSize: 8, color: "#4B5563", textTransform: "uppercase", marginBottom: 2 }}>{s.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: scoreColor(s.value), fontFamily: "'JetBrains Mono',monospace" }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Flags */}
              {(score.redFlags.length > 0 || score.greenFlags.length > 0) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
                  {score.redFlags.map((f, i) => (
                    <div key={i} style={{ display: "flex", gap: 7, fontSize: 11, color: "#FCA5A5", lineHeight: 1.5 }}>
                      <span style={{ flexShrink: 0, color: "#EF4444" }}>⚠</span>{f}
                    </div>
                  ))}
                  {score.greenFlags.map((f, i) => (
                    <div key={i} style={{ display: "flex", gap: 7, fontSize: 11, color: "#6EE7B7", lineHeight: 1.5 }}>
                      <span style={{ flexShrink: 0, color: "#10B981" }}>✓</span>{f}
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              {saveError && (
                <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#FCA5A5", fontSize: 12 }}>
                  {saveError}
                </div>
              )}
              {saved ? (
                <div style={{
                  padding: "12px", borderRadius: 10, textAlign: "center",
                  background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
                  fontSize: 13, fontWeight: 600, color: "#10B981",
                }}>
                  ✓ Deal saved to My Deals
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setStep("input")}
                    style={{
                      flex: 1, padding: "11px", borderRadius: 9,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.03)",
                      color: "#6B7280", fontSize: 13, cursor: "pointer",
                    }}
                  >
                    ← Edit Inputs
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      flex: 2, padding: "11px", borderRadius: 9, border: "none",
                      background: "linear-gradient(135deg,#3B82F6,#6366F1)",
                      color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
                    }}
                  >
                    {saving ? "Saving..." : "Save Deal to Dashboard →"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── DEAL DETAIL PANEL ────────────────────────────────────────────────────────

function DealDetailPanel({
  deal, favorites, dealStatuses, isPro,
  onClose, onToggleFav, onOpenNotes, onOpenUnderwriting, onStatusChange,
}: {
  deal: DealRun;
  favorites: Set<string>;
  dealStatuses: Record<string, DealStatus>;
  isPro: boolean;
  onClose: () => void;
  onToggleFav: (id: string) => void;
  onOpenNotes: (deal: DealRun) => void;
  onOpenUnderwriting: (deal: DealRun) => void;
  onStatusChange: (id: string, s: DealStatus) => void;
}) {
  const gp     = deal.gap_pct ?? 0;
  const sc     = sigCfg(deal.signal ?? "fair");
  const status = dealStatuses[deal.id] ?? "New";
  const isFav  = favorites.has(deal.id);
  const col    = (s: number) => s >= 70 ? "#10B981" : s >= 50 ? "#F59E0B" : s >= 30 ? "#F97316" : "#EF4444";

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0,
        width: 420, height: "100vh",
        background: "#0D1117", borderLeft: "1px solid rgba(255,255,255,0.08)",
        zIndex: 201, display: "flex", flexDirection: "column",
        animation: "slideIn 0.22s ease-out", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter Tight',sans-serif" }}>
                  {IL[deal.industry] || deal.industry}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: sc.dot }} />{sc.label}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#4B5563" }}>
                {fmt(deal.asking_price)} asking · {deal.valuation_multiple.toFixed(2)}x · {ago(deal.created_at)}
                {(deal.city || deal.state) && ` · ${[deal.city, deal.state].filter(Boolean).join(", ")}`}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#4B5563", fontSize: 20, cursor: "pointer", padding: "2px 6px", lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 20px", flex: 1, overflowY: "auto" }}>

          {/* Score + metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, alignItems: "center", marginBottom: 16, padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Ring score={deal.overall_score} size={64} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
              {[
                { label: "Fair Value",    value: fmt(deal.fair_value),     color: "#10B981" },
                { label: "Gap vs Mkt",   value: (gp > 0 ? "+" : "") + gp + "%", color: gp > 0 ? "#D85A30" : "#10B981" },
                { label: "DSCR",         value: deal.dscr.toFixed(2) + "x",     color: deal.dscr >= 1.25 ? "#10B981" : "#F97316" },
                { label: "Risk",         value: deal.risk_level,                 color: col(deal.overall_score) },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ fontSize: 9, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>{m.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono',monospace" }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Status + favorite */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 10, color: "#4B5563" }}>Status:</span>
            <select
              value={status}
              onChange={e => onStatusChange(deal.id, e.target.value as DealStatus)}
              style={{ padding: "5px 9px", borderRadius: 6, border: `1px solid ${STATUS_COLORS[status].border}`, background: STATUS_COLORS[status].bg, color: STATUS_COLORS[status].color, fontSize: 10, fontWeight: 600, outline: "none", cursor: "pointer", appearance: "none" as any }}
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <StarButton dealId={deal.id} favorites={favorites} onToggle={onToggleFav} />
            <span style={{ fontSize: 11, color: isFav ? "#F59E0B" : "#4B5563" }}>{isFav ? "Watchlisted" : "Add to watchlist"}</span>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => { onOpenNotes(deal); onClose(); }}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#E2E8F0", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left" as any, display: "flex", alignItems: "center", gap: 8 }}
            >
              <span>📝</span> View Notes & Intelligence
            </button>
            <button
              onClick={() => { onOpenUnderwriting(deal); onClose(); }}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: isPro ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(255,255,255,0.08)", background: isPro ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.03)", color: isPro ? "#818CF8" : "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left" as any, display: "flex", alignItems: "center", gap: 8 }}
            >
              <span>⚡</span> Full Underwriting Analysis {!isPro && "🔒"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── UNDERWRITING PANEL ───────────────────────────────────────────────────────

type UwTab = "stress" | "sba" | "negotiation" | "memo";

function UnderwritingPanel({
  deal, isPro, onClose,
}: {
  deal: DealRun;
  isPro: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<UwTab>("stress");

  const ind = SCORE_INDUSTRIES[deal.industry];
  const gp  = deal.gap_pct ?? 0;
  const fv  = deal.fair_value ?? 0;
  const vd  = verdictCfg(deal.verdict ?? dealVerdict(deal));

  // ── Derived underwriting metrics ──────────────────────────────────────────
  const stressDscr15 = +(deal.dscr * 0.85).toFixed(2);
  const stressDscr25 = +(deal.dscr * 0.75).toFixed(2);
  const recOffer     = fv * 0.92;
  const walkAway     = fv * 1.08;
  const sbaLoan      = deal.asking_price * 0.90;
  const sbaDown      = deal.asking_price * 0.10;
  const sbaEligible  = deal.dscr >= 1.25 && deal.asking_price <= 5_000_000;
  const sbaMonthly   = sbaLoan > 0 ? (sbaLoan * (0.1075 / 12) * Math.pow(1 + 0.1075 / 12, 120)) / (Math.pow(1 + 0.1075 / 12, 120) - 1) : 0;
  const sbaDscr      = sbaMonthly > 0 ? +((deal.sde ?? 0) / (sbaMonthly * 12)).toFixed(2) : 0;

  const UW_TABS: { id: UwTab; label: string; icon: string }[] = [
    { id: "stress",      label: "Stress Test",   icon: "📉" },
    { id: "sba",         label: "SBA Finance",   icon: "🏦" },
    { id: "negotiation", label: "Negotiation",   icon: "🤝" },
    { id: "memo",        label: "Deal Memo",      icon: "📄" },
  ];

  const col = (s: number) => s >= 1.5 ? "#10B981" : s >= 1.25 ? "#F59E0B" : "#EF4444";

  const BlurredContent = ({ children }: { children: React.ReactNode }) => (
    <div style={{ position: "relative" }}>
      <div style={{ filter: isPro ? "none" : "blur(5px)", pointerEvents: isPro ? "auto" : "none", opacity: isPro ? 1 : 0.4 }}>
        {children}
      </div>
      {!isPro && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10,
        }}>
          <div style={{ padding: "16px 24px", borderRadius: 12, background: "rgba(8,12,19,0.9)", border: "1px solid rgba(99,102,241,0.2)", textAlign: "center" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>🔒</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9", marginBottom: 4 }}>Pro Feature</div>
            <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 12, maxWidth: 220 }}>Upgrade to unlock full underwriting analysis</div>
            <button style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Upgrade to Pro
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const MetricRow = ({ label, value, sub, color = "#E2E8F0" }: { label: string; value: string; sub?: string; color?: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div>
        <div style={{ fontSize: 12, color: "#94A3B8" }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: "#4B5563", marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "'JetBrains Mono',monospace" }}>{value}</div>
    </div>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: 0, right: 0,
        width: 460, height: "100vh",
        background: "#0D1117", borderLeft: "1px solid rgba(255,255,255,0.08)",
        zIndex: 201, display: "flex", flexDirection: "column",
        animation: "slideIn 0.22s ease-out",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter Tight',sans-serif" }}>
                  Underwriting — {IL[deal.industry] || deal.industry}
                </span>
                {isPro && <ProBadge />}
              </div>
              <div style={{ fontSize: 11, color: "#4B5563" }}>
                {fmt(deal.asking_price)} · {deal.valuation_multiple.toFixed(2)}x · Score {deal.overall_score} · DSCR {deal.dscr.toFixed(2)}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#4B5563", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "2px 6px" }}>×</button>
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 2, marginTop: 12 }}>
            {UW_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  flex: 1, padding: "6px 4px", borderRadius: 7, border: "none",
                  background: activeTab === t.id ? "rgba(99,102,241,0.15)" : "transparent",
                  color: activeTab === t.id ? "#C4B5FD" : "#4B5563",
                  fontSize: 11, fontWeight: activeTab === t.id ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>

          {/* Verdict banner — always visible at top */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", borderRadius: 10, marginBottom: 16,
            background: vd.bg, border: `1px solid ${vd.border}`,
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{vd.emoji}</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: vd.color, textTransform: "uppercase" as any, letterSpacing: "0.07em" }}>
                Verdict: {vd.label}
              </div>
              <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.5, marginTop: 2 }}>{vd.subtext}</div>
            </div>
          </div>

          {/* ── STRESS TEST ── */}
          {activeTab === "stress" && (
            <BlurredContent>
              <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 11, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>Base Case</div>
                <MetricRow label="DSCR at Current Terms"  value={deal.dscr.toFixed(2) + "x"}     color={col(deal.dscr)} />
                <MetricRow label="Annual Debt Service"    value={fmt((deal.sde ?? 0) / deal.dscr)} sub="SDE ÷ DSCR" />
                <MetricRow label="Monthly Payment"        value={fmt(deal.monthly_payment ?? (deal.sde ?? 0) / deal.dscr / 12)} />
              </div>
              <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}>
                <div style={{ fontSize: 11, color: "#F97316", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>Downside Scenarios</div>
                <MetricRow label="−15% Revenue Stress"   value={stressDscr15 + "x DSCR"}  color={col(stressDscr15)} sub={`SDE drops to ~${fmt((deal.sde ?? 0) * 0.85)}`} />
                <MetricRow label="−25% Revenue Stress"   value={stressDscr25 + "x DSCR"}  color={col(stressDscr25)} sub={`SDE drops to ~${fmt((deal.sde ?? 0) * 0.75)}`} />
                <MetricRow label="Break-Even SDE"        value={fmt((deal.sde ?? 0) / deal.dscr)}  sub="Minimum SDE to cover debt service" color="#F59E0B" />
                <MetricRow label="Revenue Break-Even"    value={fmt((deal.sde ?? 0) / deal.dscr / ((deal.sde ?? 0) / Math.max(deal.revenue ?? 1, 1)))}  sub="Estimated revenue needed at break-even" color="#F59E0B" />
              </div>
              <div style={{ padding: "10px 12px", borderRadius: 8, background: stressDscr15 >= 1.25 ? "rgba(16,185,129,0.06)" : "rgba(245,158,11,0.06)", border: `1px solid ${stressDscr15 >= 1.25 ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)"}`, fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>
                {stressDscr15 >= 1.25
                  ? `This deal maintains lender-minimum DSCR even at −15% revenue. Stress resilience is solid.`
                  : `A −15% revenue decline pushes DSCR below 1.25x. Validate revenue stability before proceeding.`}
              </div>
            </BlurredContent>
          )}

          {/* ── SBA FINANCE ── */}
          {activeTab === "sba" && (
            <BlurredContent>
              <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: sbaEligible ? "rgba(16,185,129,0.06)" : "rgba(245,158,11,0.06)", border: `1px solid ${sbaEligible ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{sbaEligible ? "✅" : "⚠️"}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: sbaEligible ? "#10B981" : "#F59E0B" }}>
                    SBA 7(a) {sbaEligible ? "Appears Eligible" : "May Require Review"}
                  </div>
                  <div style={{ fontSize: 11, color: "#4B5563" }}>
                    {sbaEligible ? `DSCR ${deal.dscr.toFixed(2)}x exceeds 1.25x minimum, ask under $5M` : deal.dscr < 1.25 ? `DSCR ${deal.dscr.toFixed(2)}x is below the 1.25x lender minimum` : `Deal size exceeds typical SBA 7(a) range`}
                  </div>
                </div>
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>Loan Sizing (90% LTV)</div>
                <MetricRow label="Loan Amount"           value={fmt(sbaLoan)}    color="#60A5FA" />
                <MetricRow label="Down Payment (10%)"    value={fmt(sbaDown)}    color="#F59E0B" />
                <MetricRow label="Est. Monthly Payment"  value={fmt(sbaMonthly)} sub="10yr @ 10.75% (SBA prime+2.75)" />
                <MetricRow label="DSCR at SBA Terms"     value={sbaDscr.toFixed(2) + "x"} color={col(sbaDscr)} />
                <MetricRow label="Annual Debt Service"   value={fmt(sbaMonthly * 12)} />
              </div>
              <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.12)", fontSize: 11, color: "#94A3B8", lineHeight: 1.6 }}>
                SBA 7(a) rates typically prime + 2.25–2.75%. Current estimates use 10.75%. Equity injection, goodwill caps, and lender overlays may affect final terms. Consult an SBA-preferred lender for formal qualification.
              </div>
            </BlurredContent>
          )}

          {/* ── NEGOTIATION ── */}
          {activeTab === "negotiation" && (
            <BlurredContent>
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>Pricing Position</div>
                <MetricRow label="Asking Price"         value={fmt(deal.asking_price)}  />
                <MetricRow label="NexTax Fair Value"    value={fmt(fv)}         color="#10B981" />
                <MetricRow label="Gap vs Market"        value={(gp > 0 ? "+" : "") + gp + "%"} color={gp > 0 ? "#D85A30" : "#10B981"} />
                <MetricRow label="Anchor Offer"         value={fmt(recOffer)}   color="#818CF8" sub="~8% below fair value — opens negotiation" />
                <MetricRow label="Walk-Away Price"      value={fmt(walkAway)}   color="#F97316" sub="~8% above fair value — max justified" />
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>Structure Ideas</div>
                {[
                  { title: "Seller Note",      desc: `Ask seller to carry 10–15% (${fmt(deal.asking_price * 0.12)}) over 3–5 years — reduces day-1 debt service` },
                  { title: "Earnout Clause",   desc: "Tie 10–20% of price to Year 1 revenue hitting stated levels" },
                  { title: "Working Capital",  desc: "Negotiate minimum working capital at close — protects first-90-days cash flow" },
                  { title: "Training Period",  desc: `Standard is 30–90 days paid owner training — request 90 days given ${ind?.competitionLevel ?? "market"} competition level` },
                ].map(s => (
                  <div key={s.title} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0", marginBottom: 2 }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.5 }}>{s.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: "10px 12px", borderRadius: 8, background: gp > 10 ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.06)", border: `1px solid ${gp > 10 ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)"}`, fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>
                {gp > 10
                  ? `Deal is priced ${gp}% above market fair value. Lead with the anchor at ${fmt(recOffer)} and reference comparable transactions. Seller motivation matters here.`
                  : gp < -5
                  ? `Deal is priced ${Math.abs(gp)}% below market fair value. Strong position — investigate seller motivation before moving to LOI.`
                  : `Pricing is near market median. Focus negotiation on terms (seller note, earnout) rather than price.`}
              </div>
            </BlurredContent>
          )}

          {/* ── DEAL MEMO ── */}
          {activeTab === "memo" && (
            <BlurredContent>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  {
                    title: "Deal Summary",
                    content: `${IL[deal.industry] || deal.industry} located in ${[deal.city, deal.state].filter(Boolean).join(", ") || "undisclosed market"}. Asking ${fmt(deal.asking_price)} at ${deal.valuation_multiple.toFixed(2)}x SDE, ${gp > 0 ? `${gp}% above` : `${Math.abs(gp)}% below`} the NexTax market fair value of ${fmt(fv)}. Overall score ${deal.overall_score}/100 — ${deal.risk_level} Risk.`,
                  },
                  {
                    title: "What Must Be True",
                    bullets: [
                      `SDE of ${fmt(deal.sde ?? 0)} is verified and add-backs are documented`,
                      `DSCR of ${deal.dscr.toFixed(2)}x holds under normalized owner compensation`,
                      `Revenue trend is stable or growing — no single-customer concentration above 20%`,
                      `No undisclosed liabilities, lease assignment issues, or pending litigation`,
                    ],
                  },
                  {
                    title: "Key Diligence Priorities",
                    bullets: [
                      "Request 3 years of tax returns and P&Ls prior to LOI",
                      "Validate customer list and contract transferability",
                      "Confirm lease terms and assignment clause",
                      `Stress-test SDE to ${fmt((deal.sde ?? 0) * 0.85)} (−15%) — DSCR at ${stressDscr15}x`,
                    ],
                  },
                  {
                    title: "Final Recommendation",
                    content: (() => {
                      const v = deal.verdict ?? dealVerdict(deal);
                      if (v === "high_conviction") return `🔥 HIGH CONVICTION — ${vd.subtext} Anchor at ${fmt(recOffer)}, move to LOI immediately after confirming add-backs.`;
                      if (v === "pursue")          return `🟢 PURSUE — ${vd.subtext} Anchor at ${fmt(recOffer)} and request 3 years of financials before LOI submission.`;
                      if (v === "investigate")     return `🟡 INVESTIGATE — ${vd.subtext} Validate SDE and add-backs before committing. Request 2 years of tax returns.`;
                      return `🔴 PASS — ${vd.subtext} Do not advance at current pricing. Requires ${gp > 0 ? `${gp}% price reduction` : "structural improvement"} to become viable.`;
                    })(),
                  },
                ].map(s => (
                  <div key={s.title} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 7 }}>{s.title}</div>
                    {"content" in s && <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.7 }}>{s.content}</div>}
                    {"bullets" in s && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {s.bullets!.map((b, i) => (
                          <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>
                            <span style={{ color: "#6366F1", flexShrink: 0 }}>→</span>{b}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </BlurredContent>
          )}
        </div>
      </div>
    </>
  );
}


// ─── SIGN IN REQUIRED ─────────────────────────────────────────────────────────

function SignInRequired() {
  const [email, setEmail]     = useState("");
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleMagicLink() {
    if (!email.includes("@")) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/buyer-dashboard` },
    });
    if (!error) setSent(true);
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
      <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
        <h2 style={{
          fontSize: 22, fontWeight: 700, color: "#F1F5F9", margin: "0 0 8px",
          fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.02em",
        }}>
          Sign in to access your dashboard
        </h2>
        <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 28px", lineHeight: 1.6 }}>
          Your deal history, comparison tools, and market intelligence live here.
        </p>

        {!sent ? (
          <div style={{
            background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14, padding: 24,
          }}>
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "#E2E8F0", fontSize: 14, marginBottom: 12, outline: "none",
              }}
            />
            <button
              onClick={handleMagicLink}
              disabled={!email || loading}
              style={{
                width: "100%", padding: "12px", borderRadius: 9, border: "none",
                background: email ? "linear-gradient(135deg,#3B82F6,#6366F1)" : "rgba(255,255,255,0.06)",
                color: email ? "#fff" : "#4B5563",
                fontSize: 14, fontWeight: 600,
                cursor: email && !loading ? "pointer" : "not-allowed",
              }}
            >
              {loading ? "Sending..." : "Send Magic Link →"}
            </button>
            <p style={{ fontSize: 11, color: "#374151", marginTop: 10 }}>
              Have a password? <a href="/login" style={{ color: "#6366F1", textDecoration: "none" }}>Sign in here →</a>
            </p>
          </div>
        ) : (
          <div style={{
            background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)",
            borderRadius: 14, padding: 24,
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📬</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#E2E8F0", marginBottom: 6 }}>
              Magic link sent to {email}
            </div>
            <div style={{ fontSize: 12, color: "#818CF8" }}>Click it to access your dashboard.</div>
          </div>
        )}

        <div style={{ marginTop: 20, fontSize: 13, color: "#4B5563" }}>
          No account?{" "}
          <a href="/deal-reality-check" style={{ color: "#6366F1", textDecoration: "none" }}>
            Run a free deal analysis →
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── STAT CARDS ───────────────────────────────────────────────────────────────

function StatCards({ deals, loading }: { deals: DealRun[]; loading: boolean }) {
  const avgGap = deals.length
    ? Math.round(deals.reduce((a, d) => a + (d.gap_pct ?? 0), 0) / deals.length)
    : 0;
  const best = deals.length
    ? deals.reduce((a, b) => b.overall_score > a.overall_score ? b : a)
    : null;
  const opps = deals.filter(d => (d.gap_pct ?? 0) < -5).length;

  const cards = [
    {
      label: "Deals Analyzed",
      value: String(deals.length),
      sub:   "Total in account",
      color: "#E2E8F0",
    },
    {
      label: "Avg Pricing Gap",
      value: deals.length ? `${avgGap > 0 ? "+" : ""}${avgGap}%` : "—",
      sub:   "vs market median",
      color: avgGap > 5 ? "#D85A30" : avgGap < -3 ? "#10B981" : "#F59E0B",
    },
    {
      label: "Opportunities",
      value: String(opps),
      sub:   "Priced below market",
      color: opps > 0 ? "#10B981" : "#E2E8F0",
    },
    {
      label: "Best Score",
      value: best ? String(best.overall_score) : "—",
      sub:   best ? IL[best.industry] || best.industry : "No deals yet",
      color: best ? scoreCol(best.overall_score) : "#E2E8F0",
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 28 }}>
      {cards.map(c => (
        <div key={c.label} style={{
          padding: "16px 18px", borderRadius: 12,
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{
            fontSize: 10, color: "#4B5563", textTransform: "uppercase",
            letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8,
          }}>
            {c.label}
          </div>
          {loading ? (
            <Skel h={24} w={60} />
          ) : (
            <div style={{
              fontSize: 24, fontWeight: 700, color: c.color,
              fontFamily: "'Inter Tight',sans-serif",
              letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 4,
            }}>
              {c.value}
            </div>
          )}
          <div style={{ fontSize: 11, color: "#374151" }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ─── PRO COMMAND MODULE ───────────────────────────────────────────────────────

function ProCommandModule({ deals, onOpenUnderwriting }: { deals: DealRun[]; onOpenUnderwriting: (deal: DealRun) => void }) {
  const lastAnalysis = deals.find(d => d.tool_used === "risk_analyzer") ?? deals[0];

  return (
    <Card style={{
      background: "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.05))",
      border: "1px solid rgba(99,102,241,0.2)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg,transparent,rgba(99,102,241,0.6),rgba(139,92,246,0.6),transparent)",
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <ProBadge />
        <span style={{
          fontSize: 15, fontWeight: 700, color: "#F1F5F9",
          fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.01em",
        }}>
          Full Underwriting Center
        </span>
      </div>

      {/* Summary strip */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 18,
        padding: "14px 16px", borderRadius: 10,
        background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)",
      }}>
        {[
          { label: "Rec. Offer",  value: lastAnalysis ? fmt(lastAnalysis.fair_value * 0.92) : "—",  color: "#10B981" },
          { label: "Walk-Away",   value: lastAnalysis ? fmt(lastAnalysis.fair_value * 1.08) : "—",  color: "#F97316" },
          { label: "Base DSCR",   value: lastAnalysis ? lastAnalysis.dscr.toFixed(2) + "x" : "—",  color: lastAnalysis && lastAnalysis.dscr >= 1.25 ? "#10B981" : "#F59E0B" },
          { label: "Stress DSCR", value: lastAnalysis ? (lastAnalysis.dscr * 0.82).toFixed(2) + "x" : "—", color: "#F59E0B" },
        ].map(m => (
          <div key={m.label} style={{ textAlign: "center" }}>
            <div style={{
              fontSize: 10, color: "#4B5563", textTransform: "uppercase",
              letterSpacing: "0.08em", marginBottom: 4,
            }}>
              {m.label}
            </div>
            <div style={{
              fontSize: 16, fontWeight: 700, color: m.color,
              fontFamily: "'JetBrains Mono',monospace",
            }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Last analysis row */}
      {lastAnalysis && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", borderRadius: 8,
          background: "rgba(255,255,255,0.03)", marginBottom: 14,
        }}>
          <Ring score={lastAnalysis.overall_score} size={32} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>
              Last Full Analysis — {IL[lastAnalysis.industry] || lastAnalysis.industry}
            </div>
            <div style={{ fontSize: 11, color: "#4B5563" }}>
              {ago(lastAnalysis.created_at)} · {lastAnalysis.valuation_multiple.toFixed(2)}x · DSCR {lastAnalysis.dscr.toFixed(2)}
            </div>
          </div>
          <button
            onClick={() => onOpenUnderwriting(lastAnalysis)}
            style={{
              padding: "6px 12px", borderRadius: 7,
              border: "1px solid rgba(99,102,241,0.25)",
              background: "rgba(99,102,241,0.08)",
              color: "#818CF8", fontSize: 11, fontWeight: 500, cursor: "pointer",
            }}
          >
            Open Analysis
          </button>
        </div>
      )}

      {/* Action grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {([
          { icon: "📉", label: "Stress Test Summary",  sub: "−15% & −25% scenarios",       tab: "stress"      },
          { icon: "🤝", label: "Negotiation Strategy", sub: "Anchor, walk-away, structure", tab: "negotiation" },
          { icon: "🏦", label: "SBA Finance Snapshot", sub: "Loan sizing & eligibility",    tab: "sba"         },
          { icon: "📄", label: "Deal Memo",            sub: "Summary, diligence, next step",tab: "memo"        },
        ] as { icon: string; label: string; sub: string; tab: string }[]).map(a => (
          <button
            key={a.label}
            onClick={() => { if (lastAnalysis) onOpenUnderwriting(lastAnalysis); }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 14px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.03)",
              cursor: "pointer", textAlign: "left" as const,
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>{a.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>{a.label}</div>
              <div style={{ fontSize: 10, color: "#4B5563" }}>{a.sub}</div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => { if (lastAnalysis) onOpenUnderwriting(lastAnalysis); }}
        style={{
          display: "block", width: "100%", padding: "12px", borderRadius: 10, border: "none",
          background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
          color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
          textAlign: "center" as const,
        }}
      >
        Open Full Underwriting →
      </button>
    </Card>
  );
}

// ─── PRO UPSELL CARD ─────────────────────────────────────────────────────────

function ProUpsellCard({ deals, onOpenUnderwriting }: { deals: DealRun[]; onOpenUnderwriting: (deal: DealRun) => void }) {
  return (
    <Card style={{ border: "1px solid rgba(99,102,241,0.15)", background: "rgba(99,102,241,0.04)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "3px 10px", borderRadius: 20,
            background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)",
            fontSize: 10, color: "#818CF8", fontWeight: 600,
            letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 12,
          }}>
            ⚡ Upgrade to Pro
          </div>
          <h3 style={{
            fontSize: 17, fontWeight: 700, color: "#F1F5F9", margin: "0 0 6px",
            fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.01em",
          }}>
            Unlock Full Underwriting
          </h3>
          <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 14px", lineHeight: 1.6 }}>
            Decision-grade analysis — not just a score. Built for serious acquirers.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 16px", marginBottom: 18 }}>
            {["DSCR modeling", "Downside scenarios", "Negotiation strategy", "SBA loan estimates", "Stress testing", "Downloadable memo"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#818CF8" }}>
                <span style={{ color: "#6366F1", fontSize: 10 }}>✓</span>{f}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{
              padding: "10px 20px", borderRadius: 9, border: "none",
              background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
              color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              Upgrade to Pro
            </button>
            <button
              onClick={() => { if (deals[0]) onOpenUnderwriting(deals[0]); }}
              style={{
                display: "inline-block", padding: "10px 16px", borderRadius: 9,
                border: "1px solid rgba(99,102,241,0.25)", background: "transparent",
                color: "#818CF8", fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}
            >
              Preview Analysis →
            </button>
          </div>
        </div>

        {/* Blurred preview */}
        <div style={{
          width: 180, flexShrink: 0, padding: 14, borderRadius: 10,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{
            fontSize: 10, color: "#374151", textTransform: "uppercase",
            letterSpacing: "0.08em", marginBottom: 10, fontWeight: 600,
          }}>
            Preview
          </div>
          {[
            { label: "Stress DSCR",  val: "1.09x at −15%", warn: true  },
            { label: "Walk-Away",    val: "$1.08M max",     warn: true  },
            { label: "SBA Eligible", val: "Yes — 1.41x",   warn: false },
            { label: "Negotiation",  val: "Anchor $920K",  warn: false },
          ].map(r => (
            <div key={r.label} style={{
              display: "flex", justifyContent: "space-between",
              padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}>
              <span style={{ fontSize: 10, color: "#4B5563" }}>{r.label}</span>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: r.warn ? "#F59E0B" : "#10B981",
                fontFamily: "'JetBrains Mono',monospace",
                filter: "blur(3px)", userSelect: "none" as const,
              }}>
                {r.val}
              </span>
            </div>
          ))}
          <div style={{ marginTop: 8, fontSize: 10, color: "#374151", textAlign: "center" }}>
            🔒 Upgrade to unlock
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── TAB: DASHBOARD ───────────────────────────────────────────────────────────

function TabDashboard({
  deals, dri, trending, loading, loadingMkt, isPro, favorites,
  onTabChange, onToggleFav, onOpenNotes, onOpenDetail, onOpenUnderwriting, onAnalyzeNew,
}: {
  deals: DealRun[];
  dri: DriSnapshot[];
  trending: TrendingMultiple[];
  loading: boolean;
  loadingMkt: boolean;
  isPro: boolean;
  favorites: Set<string>;
  onTabChange: (tab: TabId) => void;
  onToggleFav: (id: string) => void;
  onOpenNotes: (deal: DealRun) => void;
  onOpenDetail: (deal: DealRun) => void;
  onOpenUnderwriting: (deal: DealRun) => void;
  onAnalyzeNew: () => void;
}) {
  const recent  = deals.slice(0, 3);
  const opps    = deals.filter(d => (d.gap_pct ?? 0) < -5).slice(0, 3);
  const overDri = [...dri].sort((a, b) => (b.gap_pct ?? 0) - (a.gap_pct ?? 0)).slice(0, 4);

  return (
    <div>
      {/* Priority Deals (starred watchlist) — only shows if user has favorites */}
      <PriorityDeals
        deals={deals}
        favorites={favorites}
        onOpenNotes={onOpenNotes}
        onOpenDetail={onOpenDetail}
      />

      {/* Recent Deals */}
      <div style={{ marginBottom: 28 }}>
        <SectionHeader
          title="Recent Deals"
          sub="Your latest analyzed deals"
          action={
            <button
              onClick={() => onTabChange("my-deals")}
              style={{ background: "none", border: "none", color: "#6366F1", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
            >
              View all →
            </button>
          }
        />
        <Card>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[0, 1, 2].map(i => <Skel key={i} h={44} />)}
            </div>
          ) : recent.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#E2E8F0", marginBottom: 4 }}>No deals yet</div>
              <div style={{ fontSize: 12, color: "#4B5563", marginBottom: 14 }}>Analyze your first deal to get started.</div>
              <button
                onClick={() => onAnalyzeNew()}
                style={{
                  display: "inline-block", padding: "8px 16px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg,#3B82F6,#6366F1)",
                  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Analyze a Deal →
              </button>
            </div>
          ) : recent.map((deal, i) => {
            const gp  = deal.gap_pct ?? 0;
            const vd  = verdictCfg(deal.verdict ?? dealVerdict(deal));
            return (
              <div
                key={deal.id}
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "12px 0",
                  borderBottom: i < recent.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}
              >
                <Ring score={deal.overall_score} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>
                    {IL[deal.industry] || deal.industry}
                  </div>
                  <div style={{ fontSize: 11, color: "#4B5563" }}>
                    {fmt(deal.asking_price)} · {deal.valuation_multiple.toFixed(2)}x · {ago(deal.created_at)}
                  </div>
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: gp > 0 ? "#D85A30" : "#10B981",
                  fontFamily: "'JetBrains Mono',monospace",
                }}>
                  {gp > 0 ? "+" : ""}{gp}%
                </div>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 9px", borderRadius: 6,
                  fontSize: 10, fontWeight: 700,
                  background: vd.bg, color: vd.color, border: `1px solid ${vd.border}`,
                  whiteSpace: "nowrap" as any,
                }}>
                  {vd.emoji} {vd.label}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <StarButton dealId={deal.id} favorites={favorites} onToggle={onToggleFav} />
                  <button
                    onClick={() => onOpenNotes(deal)}
                    style={{
                      background: "none", border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 6, cursor: "pointer", padding: "4px 7px", fontSize: 11, color: "#4B5563",
                    }}
                  >
                    📝
                  </button>
                  <button
                    onClick={() => onOpenDetail(deal)}
                    style={{
                      padding: "5px 10px", borderRadius: 7,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
                      color: "#6B7280", fontSize: 11, cursor: "pointer",
                    }}
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Market Signals + Best Opportunities */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        {/* Market Signals */}
        <div>
          <SectionHeader
            title="Market Signals"
            sub="Live from DRI snapshots"
            action={
              <button
                onClick={() => onTabChange("market-intel")}
                style={{ background: "none", border: "none", color: "#6366F1", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
              >
                Full intel →
              </button>
            }
          />
          <Card>
            {loadingMkt ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[0, 1, 2, 3].map(i => <Skel key={i} h={28} />)}
              </div>
            ) : overDri.map(s => {
              const ss   = sigCfg(condSig(s.condition));
              const barW = Math.min(100, Math.abs(s.gap_pct ?? 0) * 3.5 + 6);
              return (
                <div
                  key={s.industry_key}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "7px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                  }}
                >
                  <div style={{ width: 100, fontSize: 12, color: "#94A3B8", fontWeight: 500, flexShrink: 0 }}>
                    {IL[s.industry_key] || s.industry_key}
                  </div>
                  <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.04)", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${barW}%`, background: ss.dot, borderRadius: 2 }} />
                  </div>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: ss.color,
                    fontFamily: "'JetBrains Mono',monospace", minWidth: 40, textAlign: "right",
                  }}>
                    {(s.gap_pct ?? 0) > 0 ? "+" : ""}{(s.gap_pct ?? 0).toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </Card>
        </div>

        {/* Best Opportunities */}
        <div>
          <SectionHeader
            title="Best Opportunities"
            sub="Your deals priced below market"
            action={
              <button
                onClick={() => onTabChange("my-deals")}
                style={{ background: "none", border: "none", color: "#6366F1", fontSize: 12, cursor: "pointer", fontWeight: 500 }}
              >
                All deals →
              </button>
            }
          />
          <Card>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[0, 1, 2].map(i => <Skel key={i} h={44} />)}
              </div>
            ) : opps.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>🔍</div>
                <div style={{ fontSize: 13, color: "#4B5563" }}>
                  No below-market deals yet. Analyze more deals to find opportunities.
                </div>
              </div>
            ) : opps.map((deal, i) => (
              <div
                key={deal.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                  borderBottom: i < opps.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "rgba(16,185,129,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, color: "#10B981", flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>
                    {IL[deal.industry] || deal.industry}
                  </div>
                  <div style={{ fontSize: 10, color: "#4B5563" }}>{fmt(deal.asking_price)}</div>
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: "#10B981",
                  fontFamily: "'JetBrains Mono',monospace",
                }}>
                  {deal.gap_pct}%
                </div>
                <Ring score={deal.overall_score} size={30} />
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Compare Teaser */}
      <div style={{ marginBottom: 28 }}>
        <SectionHeader title="Compare Deals" sub="Side-by-side deal intelligence" />
        <Card style={{ position: "relative" }}>
          {!isPro && <LockOverlay label="Compare is a Pro feature — upgrade to unlock" />}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, opacity: isPro ? 1 : 0.3 }}>
            {["Deal A", "Deal B"].map(label => (
              <div key={label} style={{
                padding: "12px 14px", borderRadius: 10,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{
                  fontSize: 10, color: "#4B5563", textTransform: "uppercase",
                  letterSpacing: "0.08em", marginBottom: 6,
                }}>
                  {label}
                </div>
                <div style={{ fontSize: 13, color: "#6B7280" }}>Select a deal to compare</div>
              </div>
            ))}
          </div>
          {isPro && (
            <button
              onClick={() => onTabChange("compare")}
              style={{
                marginTop: 12, width: "100%", padding: "10px", borderRadius: 9,
                border: "1px solid rgba(99,102,241,0.25)",
                background: "rgba(99,102,241,0.06)",
                color: "#818CF8", fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}
            >
              Open Compare Engine →
            </button>
          )}
        </Card>
      </div>

      {/* Pro block */}
      {isPro ? <ProCommandModule deals={deals} onOpenUnderwriting={onOpenUnderwriting} /> : <ProUpsellCard deals={deals} onOpenUnderwriting={onOpenUnderwriting} />}
    </div>
  );
}

// ─── TAB: MY DEALS ────────────────────────────────────────────────────────────

function TabMyDeals({
  deals, loading, isPro, dealStatuses, favorites,
  onStatusChange, onToggleFav, onOpenNotes, onOpenDetail, onOpenUnderwriting, onAnalyzeNew,
}: {
  deals: DealRun[];
  loading: boolean;
  isPro: boolean;
  dealStatuses: Record<string, DealStatus>;
  favorites: Set<string>;
  onStatusChange: (id: string, status: DealStatus) => void;
  onToggleFav: (id: string) => void;
  onOpenNotes: (deal: DealRun) => void;
  onOpenDetail: (deal: DealRun) => void;
  onOpenUnderwriting: (deal: DealRun) => void;
  onAnalyzeNew: () => void;
}) {
  const [search, setSearch]       = useState("");
  const [sortKey, setSortKey]     = useState<SortKey>("date");
  const [filterSig, setFilterSig] = useState<string>("all");

  const filtered = deals
    .filter(d => {
      const q        = search.toLowerCase();
      const match    = !q || (IL[d.industry] || d.industry).toLowerCase().includes(q) || (d.city || "").toLowerCase().includes(q);
      const sigMatch = filterSig === "all" || (d.verdict ?? dealVerdict(d)) === filterSig;
      return match && sigMatch;
    })
    .sort((a, b) => {
      if (sortKey === "score")  return b.overall_score - a.overall_score;
      if (sortKey === "gap")    return (a.gap_pct ?? 0) - (b.gap_pct ?? 0);
      if (sortKey === "asking") return b.asking_price - a.asking_price;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const selStyle: React.CSSProperties = {
    padding: "7px 10px", borderRadius: 7,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    color: "#94A3B8", fontSize: 12, outline: "none",
    cursor: "pointer", appearance: "none" as any,
  };

  return (
    <div>
      {/* Top Opportunities */}
      <TopOpportunities
        deals={deals}
        favorites={favorites}
        isPro={isPro}
        onToggleFav={onToggleFav}
        onOpenNotes={onOpenNotes}
        onOpenDetail={onOpenDetail}
        onOpenUnderwriting={onOpenUnderwriting}
      />

      {/* Search + filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <span style={{
            position: "absolute", left: 10, top: "50%",
            transform: "translateY(-50%)", fontSize: 13, color: "#4B5563",
          }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by industry or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "8px 12px 8px 30px", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "#E2E8F0", fontSize: 13, outline: "none",
            }}
          />
        </div>
        <select value={filterSig} onChange={(e) => setFilterSig(e.target.value)} style={selStyle}>
          <option value="all">All Verdicts</option>
          <option value="high_conviction">🔥 High Conviction</option>
          <option value="pursue">🟢 Pursue</option>
          <option value="investigate">🟡 Investigate</option>
          <option value="pass">🔴 Pass</option>
        </select>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} style={selStyle}>
          <option value="date">Sort: Newest</option>
          <option value="score">Sort: Score</option>
          <option value="gap">Sort: Best Gap</option>
          <option value="asking">Sort: Price</option>
        </select>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 0.8fr 1fr 1fr 60px 48px 130px 90px auto",
          gap: "0 8px", padding: "10px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.015)",
        }}>
          {["Deal", "Industry", "Asking", "Fair Value", "Gap", "Score", "Verdict", "Status", "Actions"].map(h => (
            <div key={h} style={{
              fontSize: 10, color: "#374151", textTransform: "uppercase",
              letterSpacing: "0.08em", fontWeight: 600,
            }}>
              {h}
            </div>
          ))}
        </div>

        {/* Loading skeletons */}
        {loading && [0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 0.8fr 1fr 1fr 60px 48px 130px 90px auto",
              gap: "0 8px", padding: "14px 18px",
              borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center",
            }}
          >
            {[70, 60, 70, 70, 40, 34, 90, 80, 100].map((w, j) => (
              <Skel key={j} h={j === 5 ? 34 : 12} w={w} />
            ))}
          </div>
        ))}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 26, marginBottom: 10 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#E2E8F0", marginBottom: 4 }}>
              {search ? "No deals match your search" : "No deals yet"}
            </div>
            <div style={{ fontSize: 12, color: "#4B5563", marginBottom: 14 }}>
              {search ? "Try a different search term." : "Analyze your first deal to get started."}
            </div>
            {!search && (
              <button
                onClick={() => onAnalyzeNew()}
                style={{
                  display: "inline-block", padding: "8px 16px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg,#3B82F6,#6366F1)",
                  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Analyze a Deal →
              </button>
            )}
          </div>
        )}

        {/* Deal rows */}
        {!loading && filtered.map((deal, i) => {
          const gp      = deal.gap_pct ?? 0;
          const vd      = verdictCfg(deal.verdict ?? dealVerdict(deal));
          const status  = dealStatuses[deal.id] ?? "New";
          const statusC = STATUS_COLORS[status];
          const loc     = [deal.city, deal.state].filter(Boolean).join(", ");
          const isFav   = favorites.has(deal.id);

          return (
            <div
              key={deal.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 0.8fr 1fr 1fr 60px 48px 130px 90px auto",
                gap: "0 8px", padding: "13px 18px",
                borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                alignItems: "center", transition: "background 0.12s",
              }}
            >
              {/* Deal name + meta */}
              <div>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: isFav ? "#F1F5F9" : "#E2E8F0",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  {isFav && <span style={{ color: "#F59E0B", fontSize: 11 }}>★</span>}
                  {IL[deal.industry] || deal.industry}
                </div>
                <div style={{ fontSize: 10, color: "#374151", marginTop: 2 }}>
                  {deal.valuation_multiple.toFixed(2)}x · DSCR {deal.dscr.toFixed(2)}{loc ? ` · ${loc}` : ""}
                </div>
                <div style={{ fontSize: 10, color: "#2D3748" }}>
                  {ago(deal.created_at)} · {deal.tool_used === "risk_analyzer" ? "Full" : "Quick"}
                </div>
              </div>

              {/* Industry */}
              <div style={{ fontSize: 11, color: "#4B5563" }}>
                {IL[deal.industry] || deal.industry}
              </div>

              {/* Asking */}
              <div style={{
                fontSize: 12, fontWeight: 500, color: "#E2E8F0",
                fontFamily: "'JetBrains Mono',monospace",
              }}>
                {fmt(deal.asking_price)}
              </div>

              {/* Fair Value */}
              <div style={{ fontSize: 12, color: "#10B981", fontFamily: "'JetBrains Mono',monospace" }}>
                {fmt(deal.fair_value)}
              </div>

              {/* Gap */}
              <div style={{
                fontSize: 12, fontWeight: 700,
                color: gp > 0 ? "#D85A30" : "#10B981",
                fontFamily: "'JetBrains Mono',monospace",
              }}>
                {gp > 0 ? "+" : ""}{gp}%
              </div>

              {/* Score ring */}
              <Ring score={deal.overall_score} size={32} />

              {/* Verdict badge */}
              <div style={{
                display: "inline-flex", flexDirection: "column", gap: 1,
              }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", borderRadius: 6,
                  fontSize: 10, fontWeight: 700,
                  background: vd.bg, color: vd.color, border: `1px solid ${vd.border}`,
                  whiteSpace: "nowrap" as any,
                }}>
                  {vd.emoji} {vd.label}
                </span>
              </div>

              {/* Status dropdown */}
              <select
                value={status}
                onChange={(e) => onStatusChange(deal.id, e.target.value as DealStatus)}
                style={{
                  padding: "4px 8px", borderRadius: 6,
                  border: `1px solid ${statusC.border}`,
                  background: statusC.bg, color: statusC.color,
                  fontSize: 10, fontWeight: 600, outline: "none",
                  cursor: "pointer", appearance: "none" as any,
                }}
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {/* Actions */}
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <StarButton dealId={deal.id} favorites={favorites} onToggle={onToggleFav} />
                <button
                  onClick={() => onOpenNotes(deal)}
                  title="Notes"
                  style={{
                    background: "none", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 6, cursor: "pointer", padding: "3px 6px", fontSize: 11, color: "#4B5563",
                  }}
                >
                  📝
                </button>
                <button
                  onClick={() => onOpenDetail(deal)}
                  style={{
                    padding: "4px 8px", borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    color: "#6B7280", fontSize: 10, cursor: "pointer",
                  }}
                >
                  View
                </button>
                <button
                  onClick={() => onOpenUnderwriting(deal)}
                  title={isPro ? "Full Underwriting" : "Pro feature"}
                  style={{
                    padding: "4px 8px", borderRadius: 6,
                    border: isPro ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(255,255,255,0.05)",
                    background: isPro ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)",
                    color: isPro ? "#818CF8" : "#374151",
                    fontSize: 10, cursor: isPro ? "pointer" : "not-allowed",
                  }}
                >
                  {isPro ? "⚡" : "🔒"}
                </button>
              </div>
            </div>
          );
        })}
      </Card>

      {!loading && filtered.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 11, color: "#374151", textAlign: "right" }}>
          {filtered.length} deal{filtered.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

// ─── TAB: COMPARE ─────────────────────────────────────────────────────────────

function TabCompare({ deals, isPro, onAnalyzeNew }: { deals: DealRun[]; isPro: boolean; onAnalyzeNew: () => void }) {
  const [mode, setMode] = useState<CompareMode>("my-deals");
  const [ai, setAi]     = useState(0);
  const [bi, setBi]     = useState(Math.min(1, deals.length - 1));

  // Free user gate
  if (!isPro) {
    return (
      <div style={{ position: "relative" }}>
        <Card style={{ filter: "blur(2px)", pointerEvents: "none", opacity: 0.4 }}>
          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr", gap: "0 12px" }}>
            {["", "Deal A", "Deal B"].map((h, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 12px",
                  background: i > 0 ? "rgba(99,102,241,0.08)" : "transparent",
                  borderRadius: i > 0 ? "8px 8px 0 0" : 0,
                  fontSize: 12, fontWeight: 600, color: "#60A5FA", textAlign: "center",
                }}
              >
                {h}
              </div>
            ))}
            {["Score", "Asking", "Fair Value", "Gap vs Mkt", "Multiple", "DSCR"].map(r => (
              <React.Fragment key={r}>
                <div style={{ padding: "10px 0", fontSize: 11, color: "#4B5563" }}>{r}</div>
                <div style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "#818CF8", textAlign: "center", background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.1)", borderTop: "none" }}>—</div>
                <div style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "#A5B4FC", textAlign: "center", background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.1)", borderTop: "none" }}>—</div>
              </React.Fragment>
            ))}
          </div>
        </Card>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            padding: "28px 36px", borderRadius: 14,
            background: "rgba(8,12,19,0.92)", border: "1px solid rgba(99,102,241,0.2)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#F1F5F9", marginBottom: 6, fontFamily: "'Inter Tight',sans-serif" }}>
              Compare is a Pro feature
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 16, maxWidth: 280 }}>
              Upgrade to compare any two deals side-by-side against your portfolio and market comps.
            </div>
            <button style={{
              padding: "10px 24px", borderRadius: 9, border: "none",
              background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
              color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Need 2+ deals
  if (deals.length < 2) {
    return (
      <Card style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⇄</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#E2E8F0", marginBottom: 6 }}>
          Analyze 2+ deals to compare
        </div>
        <div style={{ fontSize: 13, color: "#4B5563", marginBottom: 16 }}>
          You need at least two saved deals to use the comparison engine.
        </div>
        <button
          onClick={() => onAnalyzeNew()}
          style={{
            display: "inline-block", padding: "9px 18px", borderRadius: 9, border: "none",
            background: "linear-gradient(135deg,#3B82F6,#6366F1)",
            color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          Analyze a Deal →
        </button>
      </Card>
    );
  }

  const a    = deals[ai];
  const b    = deals[bi];
  const aGap = a?.gap_pct ?? 0;
  const bGap = b?.gap_pct ?? 0;
  const aLbl = IL[a?.industry] || a?.industry;
  const bLbl = IL[b?.industry] || b?.industry;

  const selStyle: React.CSSProperties = {
    padding: "9px 12px", borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
    color: "#E2E8F0", fontSize: 13, outline: "none",
    width: "100%", appearance: "none" as any,
  };

  const rows = [
    { label: "Score",      aV: String(a?.overall_score ?? "—"),                 bV: String(b?.overall_score ?? "—"),                 aC: scoreCol(a?.overall_score ?? 0), bC: scoreCol(b?.overall_score ?? 0) },
    { label: "Asking",     aV: fmtFull(a?.asking_price ?? 0),                   bV: fmtFull(b?.asking_price ?? 0),                   aC: "#E2E8F0",                       bC: "#E2E8F0" },
    { label: "Fair Value", aV: fmtFull(a?.fair_value ?? 0),                     bV: fmtFull(b?.fair_value ?? 0),                     aC: "#10B981",                       bC: "#10B981" },
    { label: "Gap vs Mkt", aV: (aGap > 0 ? "+" : "") + aGap + "%",             bV: (bGap > 0 ? "+" : "") + bGap + "%",             aC: aGap > 0 ? "#D85A30" : "#10B981", bC: bGap > 0 ? "#D85A30" : "#10B981" },
    { label: "Multiple",   aV: (a?.valuation_multiple ?? 0).toFixed(2) + "x",  bV: (b?.valuation_multiple ?? 0).toFixed(2) + "x",  aC: "#E2E8F0",                       bC: "#E2E8F0" },
    { label: "DSCR",       aV: (a?.dscr ?? 0).toFixed(2),                      bV: (b?.dscr ?? 0).toFixed(2),                      aC: (a?.dscr ?? 0) >= 1.25 ? "#10B981" : "#F97316", bC: (b?.dscr ?? 0) >= 1.25 ? "#10B981" : "#F97316" },
    { label: "Risk Level", aV: a?.risk_level ?? "—",                           bV: b?.risk_level ?? "—",                           aC: "#94A3B8",                       bC: "#94A3B8" },
  ];

  const gapDiff = Math.abs(aGap - bGap);
  const winner  = aGap < bGap ? aLbl : bLbl;
  const insight = aGap === bGap
    ? "Both deals sit at similar pricing positions relative to their market benchmarks."
    : `${winner} has the stronger pricing position — priced ${gapDiff}% closer to (or below) the market median. ${aGap < -5 || bGap < -5 ? "The below-market deal warrants a closer look at seller motivation." : "Neither deal is dramatically mispriced — negotiate on terms and structure."}`;

  return (
    <div>
      {/* Mode tabs */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 18,
        background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 4,
        border: "1px solid rgba(255,255,255,0.06)", width: "fit-content",
      }}>
        {([["my-deals", "My Deals"], ["market", "Market Comps"], ["closed", "Closed Comps"]] as [CompareMode, string][]).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "7px 14px", borderRadius: 7, border: "none",
              background: mode === m ? "rgba(99,102,241,0.18)" : "transparent",
              color: mode === m ? "#C4B5FD" : "#4B5563",
              fontSize: 12, fontWeight: mode === m ? 600 : 400,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {label}
            {m !== "my-deals" && <span style={{ fontSize: 9, color: "#374151", marginLeft: 2 }}>🔒</span>}
          </button>
        ))}
      </div>

      <Card>
        {/* Deal selectors */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", gap: 12, alignItems: "center", marginBottom: 20 }}>
          <div>
            <label style={{
              display: "block", fontSize: 10, color: "#4B5563",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5,
            }}>
              Deal A
            </label>
            <select value={ai} onChange={(e) => setAi(Number(e.target.value))} style={selStyle}>
              {deals.map((d, i) => (
                <option key={d.id} value={i}>{IL[d.industry] || d.industry} — {fmt(d.asking_price)}</option>
              ))}
            </select>
          </div>
          <div style={{ textAlign: "center", fontSize: 20, color: "#4B5563", marginTop: 18 }}>⇄</div>
          <div>
            <label style={{
              display: "block", fontSize: 10, color: "#4B5563",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5,
            }}>
              Deal B
            </label>
            <select value={bi} onChange={(e) => setBi(Number(e.target.value))} style={selStyle}>
              {deals.map((d, i) => (
                <option key={d.id} value={i}>{IL[d.industry] || d.industry} — {fmt(d.asking_price)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Comparison grid */}
        <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr", gap: "0 12px" }}>
          <div />
          <div style={{ padding: "8px 12px", borderRadius: "8px 8px 0 0", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", borderBottom: "none", fontSize: 12, fontWeight: 600, color: "#60A5FA", textAlign: "center" }}>
            {aLbl}
          </div>
          <div style={{ padding: "8px 12px", borderRadius: "8px 8px 0 0", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)", borderBottom: "none", fontSize: 12, fontWeight: 600, color: "#A5B4FC", textAlign: "center" }}>
            {bLbl}
          </div>
          {rows.map((row, i) => (
            <React.Fragment key={row.label}>
              <div style={{
                padding: "10px 0", fontSize: 11, color: "#4B5563",
                display: "flex", alignItems: "center",
                borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                {row.label}
              </div>
              <div style={{
                padding: "10px 12px", fontSize: 13, fontWeight: 600, color: row.aC,
                textAlign: "center", fontFamily: "'JetBrains Mono',monospace",
                background: "rgba(59,130,246,0.03)", border: "1px solid rgba(59,130,246,0.08)",
                borderTop: "none", borderBottom: i < rows.length - 1 ? "none" : "1px solid rgba(59,130,246,0.08)",
              }}>
                {row.aV}
              </div>
              <div style={{
                padding: "10px 12px", fontSize: 13, fontWeight: 600, color: row.bC,
                textAlign: "center", fontFamily: "'JetBrains Mono',monospace",
                background: "rgba(99,102,241,0.03)", border: "1px solid rgba(99,102,241,0.08)",
                borderTop: "none", borderBottom: i < rows.length - 1 ? "none" : "1px solid rgba(99,102,241,0.08)",
              }}>
                {row.bV}
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Insight bar */}
        <div style={{
          marginTop: 16, padding: "12px 16px", borderRadius: 10,
          background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)",
          display: "flex", gap: 10,
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
          <span style={{ fontSize: 13, color: "#FBBF24", lineHeight: 1.6 }}>{insight}</span>
        </div>
      </Card>
    </div>
  );
}

// ─── LOCAL MARKET REALITY CHECK ──────────────────────────────────────────────

type SaturationResult = {
  saturationScore: number;
  riskBand: string;
  totalCompetitors: number;
  directCompetitors: number;
  indirectCompetitors: number;
  franchiseCount: number;
  densityPer10k: number;
  popPerCompetitor: number;
  populationEstimate: number;
  avgRating: number;
  totalEstRevenue: number;
  typeBreakdown: { direct: number; indirect: number; franchise: number; adjacent: number };
};

function LocalMarketRealityCheck({
  deals, isPro,
}: {
  deals: DealRun[];
  isPro: boolean;
}) {
  const [selectedDealId, setSelectedDealId] = useState<string>("");
  const [radius, setRadius]                 = useState<number>(10);
  const [loading, setLoading]               = useState(false);
  const [result, setResult]                 = useState<SaturationResult | null>(null);
  const [aiInsight, setAiInsight]           = useState<string>("");
  const [error, setError]                   = useState<string>("");

  const RADIUS_OPTIONS = [5, 10, 15, 25];

  const selectedDeal = deals.find(d => d.id === selectedDealId) ?? null;

  // Derive a location string from the deal for the MarketView API.
  // For county-level city fields, we format as "Orange County, FL, USA" which
  // Google Geocoding API resolves reliably to a county centroid.
  const dealLocation = (() => {
    if (!selectedDeal) return "";
    const city  = selectedDeal.city  ?? "";
    const state = selectedDeal.state ?? "";
    if (!city && !state) return "";
    // If it looks like a county, format explicitly so Google resolves it correctly
    const isCounty = /county|parish|borough/i.test(city);
    const parts = [city, state].filter(Boolean);
    return isCounty ? `${parts.join(", ")}, USA` : parts.join(", ");
  })();

  const locationLooksLikeCounty = selectedDeal?.city
    ? /county|parish|borough/i.test(selectedDeal.city)
    : false;

  const [categoryOverride, setCategoryOverride] = useState<string>("");

  // Reset override when deal changes
  useEffect(() => { setCategoryOverride(""); }, [selectedDealId]);

  // Map NexTax industry key → best matching MarketView category string.
  // Falls back to fuzzy substring match against CATEGORIES if no exact entry.
  function toMarketViewCategory(industry: string): string {
    const map: Record<string, string> = {
      gym:             "Fitness / Gym",
      restaurant:      "Restaurant / Fast Casual",
      autorepair:      "Auto Repair / Service",
      dental:          "Dental Practice",
      medspa:          "Med Spa / Aesthetics",
      hairsalon:       "Hair Salon / Barbershop",
      daycare:         "Childcare / Daycare",
      petcare:         "Pet Services / Grooming",
      cleaning:        "Cleaning / Janitorial",
      hvac:            "HVAC / Plumbing",
      plumbing:        "HVAC / Plumbing",
      accounting:      "Accounting / Tax Services",
      physicaltherapy: "Physical Therapy / Chiropractic",
      laundromat:      "Laundromat / Dry Cleaning",
      insurance:       "Insurance Agency",
      realestatebrok:  "Real Estate Brokerage",
      landscaping:     "Landscaping / Lawn Care",
      carwash:         "Car Wash",
      roofing:         "Roofing / Exterior",
      pharmacy:        "Pharmacy / Compounding",
      electrical:      "Electrical Services",
      healthcare:      "Home Health / Healthcare",
      transportation:  "Transportation / Logistics",
      printing:        "Printing / Signage",
      signmaking:      "Printing / Signage",
      storage:         "Self-Storage",
      painting:        "Painting / Coatings",
      security:        "Security / Alarm Services",
      construction:    "Construction / General Contractor",
      engineering:     "Engineering / Environmental",
      grocery:         "Grocery / Specialty Food",
      propertymanage:  "Property Management",
      remodeling:      "Remodeling / Home Improvement",
      seniorcare:      "Senior Care / Assisted Living",
      staffing:        "Staffing / Recruiting",
      veterinary:      "Veterinary Practice",
      marketing:       "Marketing / Advertising Agency",
      pestcontrol:     "Pest Control",
      ecommerce:       "Ecommerce / Fulfillment",
      saas:            "SaaS / Software",
    };
    const mapped = map[industry];
    if (mapped && CATEGORIES.includes(mapped)) return mapped;
    const label = (IL[industry] || industry).toLowerCase();
    const fuzzy = CATEGORIES.find(c =>
      c.toLowerCase().includes(label) ||
      label.includes(c.toLowerCase().split(" ")[0])
    );
    return fuzzy ?? mapped ?? IL[industry] ?? industry;
  }

  // The category actually sent — user override takes priority
  const effectiveCategory = categoryOverride || (selectedDeal ? toMarketViewCategory(selectedDeal.industry) : "");

  async function runCheck() {
    if (!selectedDeal || !dealLocation) return;
    setLoading(true);
    setResult(null);
    setAiInsight("");
    setError("");
    try {
      const res = await fetch("/api/marketview/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address:  dealLocation,
          category: effectiveCategory,
          radius,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Analysis failed");
      }
      const data = await res.json();
      const m = data.metrics ?? data;
      const normalized: SaturationResult = {
        saturationScore:     m.saturationScore    ?? 0,
        riskBand:            m.riskBand           ?? "",
        totalCompetitors:    m.totalCompetitors   ?? 0,
        directCompetitors:   m.directCompetitors  ?? 0,
        indirectCompetitors: m.indirectCompetitors ?? 0,
        franchiseCount:      m.franchiseSiblings  ?? m.franchiseCount ?? 0,
        densityPer10k:       m.densityPer10k      ?? 0,
        popPerCompetitor:    m.popPerCompetitor   ?? 0,
        populationEstimate:  m.populationEstimate ?? 0,
        typeBreakdown: {
          direct:    m.typeBreakdown?.direct    ?? 0,
          indirect:  m.typeBreakdown?.indirect  ?? 0,
          franchise: m.typeBreakdown?.franchise ?? 0,
          adjacent:  m.typeBreakdown?.adjacent  ?? 0,
        },
      };
      setResult(normalized);
      setAiInsight(data.aiInsight ?? "");
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  }

  // Saturation color scale
  function satColor(score: number) {
    if (score >= 75) return "#EF4444";
    if (score >= 55) return "#F97316";
    if (score >= 35) return "#F59E0B";
    return "#10B981";
  }

  function satLabel(score: number) {
    if (score >= 75) return "Critical";
    if (score >= 55) return "High";
    if (score >= 35) return "Moderate";
    return "Low";
  }

  // Simple inline gauge bar
  function GaugeBar({ score }: { score: number }) {
    const col = satColor(score);
    return (
      <div style={{ marginBottom: 6 }}>
        <div style={{
          height: 8, borderRadius: 4,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden", position: "relative",
        }}>
          {/* Gradient track */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(90deg, #10B981 0%, #F59E0B 40%, #F97316 70%, #EF4444 100%)",
            opacity: 0.25,
          }} />
          {/* Fill */}
          <div style={{
            height: "100%", width: `${score}%`,
            background: col, borderRadius: 4,
            transition: "width 1s ease",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
          {["Low", "Moderate", "High", "Critical"].map(l => (
            <span key={l} style={{ fontSize: 9, color: "#2D3748" }}>{l}</span>
          ))}
        </div>
      </div>
    );
  }

  const selStyle: React.CSSProperties = {
    padding: "8px 12px", borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.09)",
    background: "rgba(255,255,255,0.03)",
    color: "#E2E8F0", fontSize: 13, outline: "none",
    cursor: "pointer", appearance: "none" as any, width: "100%",
  };

  return (
    <div style={{ marginBottom: 28 }}>
      <SectionHeader
        title="Local Market Reality Check"
        sub="Competitive density analysis powered by MarketView"
        action={<ProBadge />}
      />

      {/* Free gate */}
      {!isPro ? (
        <Card style={{ position: "relative" }}>
          <LockOverlay label="Upgrade to Pro to run local market saturation checks" />
          <div style={{ opacity: 0.15 }}>
            {/* Ghost UI */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, marginBottom: 14 }}>
              <div style={{ height: 38, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              <div style={{ height: 38, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
              <div style={{ height: 38, width: 140, borderRadius: 8, background: "rgba(59,130,246,0.15)" }} />
            </div>
            <div style={{ height: 140, borderRadius: 10, background: "rgba(255,255,255,0.02)" }} />
          </div>
        </Card>
      ) : (
        <Card>
          {/* Controls */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "flex-end", marginBottom: 16 }}>
            {/* Deal selector */}
            <div>
              <div style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>
                Select Deal
              </div>
              <select
                value={selectedDealId}
                onChange={(e) => { setSelectedDealId(e.target.value); setResult(null); setAiInsight(""); }}
                style={selStyle}
              >
                <option value="">Choose a deal...</option>
                {deals
                  .filter(d => d.city || d.state)
                  .map(d => (
                    <option key={d.id} value={d.id}>
                      {IL[d.industry] || d.industry}
                      {d.city ? ` — ${d.city}` : ""}
                      {d.state ? `, ${d.state}` : ""}
                    </option>
                  ))
                }
              </select>
              {deals.filter(d => !d.city && !d.state).length > 0 && (
                <div style={{ fontSize: 10, color: "#374151", marginTop: 4 }}>
                  {deals.filter(d => !d.city && !d.state).length} deal(s) hidden — no location data
                </div>
              )}
            </div>

            {/* Radius selector */}
            <div>
              <div style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>
                Radius
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {RADIUS_OPTIONS.map(r => (
                  <button
                    key={r}
                    onClick={() => setRadius(r)}
                    style={{
                      padding: "8px 10px", borderRadius: 7, border: "none",
                      background: radius === r ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.04)",
                      color: radius === r ? "#C4B5FD" : "#4B5563",
                      fontSize: 12, fontWeight: radius === r ? 600 : 400,
                      cursor: "pointer", fontFamily: "'JetBrains Mono',monospace",
                    }}
                  >
                    {r}mi
                  </button>
                ))}
              </div>
            </div>

            {/* Run button */}
            <button
              onClick={runCheck}
              disabled={!selectedDealId || loading}
              style={{
                padding: "9px 20px", borderRadius: 8, border: "none",
                background: selectedDealId && !loading
                  ? "linear-gradient(135deg,#3B82F6,#6366F1)"
                  : "rgba(255,255,255,0.05)",
                color: selectedDealId && !loading ? "#fff" : "#374151",
                fontSize: 13, fontWeight: 600,
                cursor: selectedDealId && !loading ? "pointer" : "not-allowed",
                whiteSpace: "nowrap" as any,
                alignSelf: "flex-end",
              }}
            >
              {loading ? "Analyzing..." : "Run Check →"}
            </button>
          </div>

          {/* Controls row 2 — category override */}
          {selectedDeal && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>
                MarketView Category
                <span style={{ marginLeft: 6, fontSize: 9, color: "#374151", fontWeight: 400, textTransform: "none" as any }}>
                  Auto-mapped from industry — change if results look wrong
                </span>
              </div>
              <select
                value={categoryOverride || toMarketViewCategory(selectedDeal.industry)}
                onChange={(e) => setCategoryOverride(e.target.value)}
                style={{ ...selStyle, maxWidth: 320 }}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Deal context pill */}
          {selectedDeal && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "5px 12px", borderRadius: 20, marginBottom: 8,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                fontSize: 11, color: "#6B7280",
              }}>
                <span style={{ color: "#818CF8" }}>{IL[selectedDeal.industry] || selectedDeal.industry}</span>
                <span>·</span>
                <span>{dealLocation}</span>
                <span>·</span>
                <span>{radius}mi radius</span>
                <span>·</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "#10B981" }}>{effectiveCategory}</span>
              </div>
              {locationLooksLikeCounty && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 7,
                  padding: "8px 12px", borderRadius: 8,
                  background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)",
                  fontSize: 11, color: "#A5B4FC", lineHeight: 1.5,
                }}>
                  <span style={{ flexShrink: 0 }}>ℹ</span>
                  <span>
                    County-level location detected. Searching from the county centroid — results
                    may be slightly less precise than a specific city. If you see zero competitors,
                    try editing the deal to use the primary city name (e.g. "Orlando" instead of "Orange County").
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 14,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              color: "#FCA5A5", fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
              <div style={{ fontSize: 11, color: "#374151", marginBottom: 4 }}>
                Geocoding → Pulling competitors → AI classification → Computing metrics...
              </div>
              <Skel h={10} w="70%" />
              <Skel h={10} w="50%" />
              <Skel h={10} w="85%" />
              <Skel h={90} />
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div style={{ animation: "fadeUp 0.3s ease-out" }}>

              {/* Zero results warning */}
              {result.totalCompetitors === 0 && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  padding: "10px 14px", borderRadius: 8, marginBottom: 14,
                  background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)",
                  fontSize: 12, color: "#FBBF24", lineHeight: 1.6,
                }}>
                  <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span>
                  <span>
                    <strong>Zero competitors returned.</strong> This usually means the location wasn't precise enough for the Places API,
                    or the category didn't match any nearby listings. Try a deal with a specific city name, or verify
                    the address resolves correctly in MarketView directly.
                  </span>
                </div>
              )}

              {/* Score + gauge */}
              <div style={{
                display: "grid", gridTemplateColumns: "180px 1fr", gap: 20,
                padding: "16px 18px", borderRadius: 12, marginBottom: 16,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{
                    fontSize: 52, fontWeight: 800, lineHeight: 1,
                    color: satColor(result.saturationScore),
                    fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.04em",
                    marginBottom: 6,
                  }}>
                    {result.saturationScore}
                  </div>
                  <div style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                    / 100
                  </div>
                  <span style={{
                    display: "inline-block", padding: "3px 10px", borderRadius: 20,
                    background: `${satColor(result.saturationScore)}22`,
                    border: `1px solid ${satColor(result.saturationScore)}44`,
                    fontSize: 11, fontWeight: 700,
                    color: satColor(result.saturationScore),
                    textTransform: "uppercase" as any, letterSpacing: "0.06em",
                  }}>
                    {satLabel(result.saturationScore)} Saturation
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <GaugeBar score={result.saturationScore} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", marginTop: 10 }}>
                    {[
                      { label: "Total Competitors", value: String(result.totalCompetitors) },
                      { label: "Density / 10K Pop", value: result.densityPer10k.toFixed(2) },
                      { label: "Pop / Competitor",  value: result.popPerCompetitor.toLocaleString() },
                      { label: "Est. Population",   value: `~${(result.populationEstimate / 1000).toFixed(0)}K` },
                    ].map(m => (
                      <div key={m.label}>
                        <div style={{ fontSize: 9, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{m.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#E2E8F0", fontFamily: "'JetBrains Mono',monospace" }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Competitor breakdown */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>
                  Competitor Breakdown
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {[
                    { label: "Direct",    value: result.typeBreakdown.direct,    color: "#EF4444", bg: "rgba(239,68,68,0.08)"   },
                    { label: "Indirect",  value: result.typeBreakdown.indirect,  color: "#F59E0B", bg: "rgba(245,158,11,0.08)"  },
                    { label: "Franchise", value: result.typeBreakdown.franchise, color: "#8B5CF6", bg: "rgba(139,92,246,0.08)"  },
                    { label: "Adjacent",  value: result.typeBreakdown.adjacent,  color: "#6B7280", bg: "rgba(107,114,128,0.08)" },
                  ].map(b => (
                    <div
                      key={b.label}
                      style={{
                        padding: "12px 14px", borderRadius: 10,
                        background: b.bg,
                        border: `1px solid ${b.color}22`,
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 24, fontWeight: 700, color: b.color, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1, marginBottom: 4 }}>
                        {b.value}
                      </div>
                      <div style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {b.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Market density bar */}
              <div style={{
                padding: "12px 14px", borderRadius: 10, marginBottom: 16,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                    Market Density Pressure
                  </span>
                  <span style={{ fontSize: 11, color: "#6B7280", fontFamily: "'JetBrains Mono',monospace" }}>
                    {result.densityPer10k.toFixed(2)} per 10K · {result.popPerCompetitor.toLocaleString()} pop/comp
                  </span>
                </div>
                {/* Segmented bar */}
                {result.totalCompetitors > 0 && (
                  <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", gap: 1 }}>
                    {[
                      { pct: result.typeBreakdown.direct    / result.totalCompetitors, color: "#EF4444" },
                      { pct: result.typeBreakdown.indirect  / result.totalCompetitors, color: "#F59E0B" },
                      { pct: result.typeBreakdown.franchise / result.totalCompetitors, color: "#8B5CF6" },
                      { pct: result.typeBreakdown.adjacent  / result.totalCompetitors, color: "#6B7280" },
                    ].filter(s => s.pct > 0).map((seg, i) => (
                      <div
                        key={i}
                        style={{
                          height: "100%",
                          width: `${seg.pct * 100}%`,
                          background: seg.color,
                          borderRadius: i === 0 ? "5px 0 0 5px" : i === 3 ? "0 5px 5px 0" : 0,
                        }}
                      />
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                  {[
                    { label: "Direct",    color: "#EF4444" },
                    { label: "Indirect",  color: "#F59E0B" },
                    { label: "Franchise", color: "#8B5CF6" },
                    { label: "Adjacent",  color: "#6B7280" },
                  ].map(l => (
                    <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
                      <span style={{ fontSize: 10, color: "#4B5563" }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Plain-English Interpretation */}
              {aiInsight && (
                <div style={{
                  padding: "14px 16px", borderRadius: 10,
                  background: "linear-gradient(135deg,rgba(99,102,241,0.06),rgba(139,92,246,0.04))",
                  border: "1px solid rgba(99,102,241,0.15)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 12 }}>◈</span>
                    <span style={{ fontSize: 10, color: "#818CF8", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                      AI Market Interpretation
                    </span>
                  </div>
                  <p style={{
                    fontSize: 13, lineHeight: 1.7,
                    color: "rgba(255,255,255,0.75)", margin: 0,
                    // Strip any markdown bold markers from MarketView output
                    whiteSpace: "pre-wrap" as any,
                  }}>
                    {aiInsight.replace(/\*\*/g, "")}
                  </p>
                </div>
              )}

              {/* Link to full MarketView tool */}
              <div style={{ marginTop: 12, textAlign: "right" }}>
                <a
                  href="/marketview"
                  style={{
                    fontSize: 11, color: "#6366F1", textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  Open full MarketView tool →
                </a>
              </div>
            </div>
          )}

          {/* Empty state — no deal selected yet */}
          {!result && !loading && !error && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#374151", fontSize: 13 }}>
              Select a deal above and choose a radius to run a local market saturation check.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ─── TAB: MARKET INTEL ───────────────────────────────────────────────────────

function TabMarketIntel({
  dri, trending, loading, isPro, deals,
}: {
  dri: DriSnapshot[];
  trending: TrendingMultiple[];
  loading: boolean;
  isPro: boolean;
  deals: DealRun[];
}) {
  const overpriced  = [...dri].sort((a, b) => (b.gap_pct ?? 0) - (a.gap_pct ?? 0)).slice(0, 6);
  const undervalued = [...dri].sort((a, b) => (a.gap_pct ?? 0) - (b.gap_pct ?? 0)).slice(0, 6);
  const avgDri      = dri.length
    ? (dri.reduce((a, s) => a + (s.dri ?? 0), 0) / dri.length).toFixed(2)
    : "—";
  const totalListings = dri.reduce((a, s) => a + (s.deal_count ?? 0), 0);

  return (
    <div>
      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 28 }}>
        {[
          { label: "Avg Market DRI",         value: avgDri,                            sub: "Deal Reality Index",      color: "#F59E0B" },
          { label: "Active Listings Tracked", value: totalListings.toLocaleString(),    sub: "Across all industries",   color: "#60A5FA" },
          { label: "Overpriced Industries",   value: String(dri.filter(s => condSig(s.condition) === "overpriced").length), sub: "Currently above median", color: "#D85A30" },
        ].map(c => (
          <div key={c.label} style={{
            padding: "16px 18px", borderRadius: 12,
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{
              fontSize: 10, color: "#4B5563", textTransform: "uppercase",
              letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8,
            }}>
              {c.label}
            </div>
            {loading ? <Skel h={22} w={60} /> : (
              <div style={{
                fontSize: 22, fontWeight: 700, color: c.color,
                fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.02em", marginBottom: 4,
              }}>
                {c.value}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#374151" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Most Overpriced + Best Opportunities */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        {/* Most Overpriced */}
        <div>
          <SectionHeader title="Most Overpriced" sub="Buyers paying above market — avoid or negotiate hard" />
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 56px 100px",
              padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(255,255,255,0.01)",
            }}>
              {["Industry", "Gap", "Signal"].map(h => (
                <div key={h} style={{ fontSize: 10, color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                  {h}
                </div>
              ))}
            </div>
            {loading ? (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {[0, 1, 2, 3].map(i => <Skel key={i} h={28} />)}
              </div>
            ) : overpriced.map((s, i) => {
              const ss = sigCfg("overpriced");
              return (
                <div
                  key={s.industry_key}
                  style={{
                    display: "grid", gridTemplateColumns: "1fr 56px 100px",
                    padding: "10px 16px",
                    borderBottom: i < overpriced.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                    background: i % 2 === 0 ? "rgba(216,90,48,0.02)" : "transparent",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 500 }}>
                    {IL[s.industry_key] || s.industry_key}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#D85A30", fontFamily: "'JetBrains Mono',monospace" }}>
                    +{(s.gap_pct ?? 0).toFixed(0)}%
                  </div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    padding: "2px 8px", borderRadius: 20,
                    fontSize: 10, fontWeight: 600,
                    background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`,
                  }}>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: ss.dot }} />
                    Overpriced
                  </span>
                </div>
              );
            })}
          </Card>
        </div>

        {/* Best Opportunities */}
        <div>
          <SectionHeader title="Best Opportunities" sub="Industries priced below median — buyer's market" />
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 56px 100px",
              padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(255,255,255,0.01)",
            }}>
              {["Industry", "Gap", "Signal"].map(h => (
                <div key={h} style={{ fontSize: 10, color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                  {h}
                </div>
              ))}
            </div>
            {loading ? (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {[0, 1, 2, 3].map(i => <Skel key={i} h={28} />)}
              </div>
            ) : undervalued
                .filter(s => condSig(s.condition) === "opportunity")
                .map((s, i, arr) => {
                  const ss = sigCfg("opportunity");
                  return (
                    <div
                      key={s.industry_key}
                      style={{
                        display: "grid", gridTemplateColumns: "1fr 56px 100px",
                        padding: "10px 16px",
                        borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                        background: i % 2 === 0 ? "rgba(16,185,129,0.02)" : "transparent",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 500 }}>
                        {IL[s.industry_key] || s.industry_key}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#10B981", fontFamily: "'JetBrains Mono',monospace" }}>
                        {(s.gap_pct ?? 0).toFixed(0)}%
                      </div>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 3,
                        padding: "2px 8px", borderRadius: 20,
                        fontSize: 10, fontWeight: 600,
                        background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`,
                      }}>
                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: ss.dot }} />
                        Opportunity
                      </span>
                    </div>
                  );
                })
            }
          </Card>
        </div>
      </div>

      {/* Trending Multiples */}
      <div style={{ marginBottom: 28 }}>
        <SectionHeader title="Trending Multiples" sub="From DealStats closed transaction database" />
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {loading ? (
              [0, 1, 2, 3].map(i => <Skel key={i} h={52} />)
            ) : trending.slice(0, 8).map(t => (
              <div key={t.industry_key} style={{
                padding: "12px 14px", borderRadius: 10,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}>
                <div style={{ fontSize: 10, color: "#4B5563", marginBottom: 4 }}>
                  {IL[t.industry_key] || t.industry_key}
                </div>
                <div style={{
                  fontSize: 16, fontWeight: 700, color: "#E2E8F0",
                  fontFamily: "'JetBrains Mono',monospace", marginBottom: 2,
                }}>
                  {t.median_multiple.toFixed(2)}x
                </div>
                <div style={{ fontSize: 10, color: "#2D3748" }}>{t.sample_size} closed deals</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Deals Worth Reviewing — Pro only */}
      <div style={{ marginBottom: 20 }}>
        <SectionHeader
          title="Deals Worth Reviewing This Week"
          sub="Based on market signals and your deal history"
          action={<ProBadge />}
        />
        <Card style={{ position: "relative" }}>
          {!isPro && <LockOverlay label="Upgrade to Pro to unlock deal recommendations" />}
          <div style={{ opacity: isPro ? 1 : 0.2 }}>
            <div style={{ fontSize: 13, color: "#4B5563", textAlign: "center", padding: "20px 0" }}>
              {isPro
                ? "Recommendations will appear here based on your deal history and live DRI signals."
                : "Pro feature — upgrade to unlock."}
            </div>
          </div>
        </Card>
      </div>

      {/* Local Market Reality Check */}
      <LocalMarketRealityCheck deals={deals} isPro={isPro} />

      <div style={{ textAlign: "center" }}>
        <a
          href="/marketview"
          style={{
            display: "inline-block", padding: "11px 24px", borderRadius: 10,
            border: "1px solid rgba(59,130,246,0.25)",
            background: "rgba(59,130,246,0.06)",
            color: "#60A5FA", fontSize: 14, fontWeight: 500, textDecoration: "none",
          }}
        >
          Explore Full Market Intelligence →
        </a>
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────

export default function BuyerDashboard() {
  const [user, setUser]               = useState<any>(null);
  const [profile, setProfile]         = useState<Profile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [activeTab, setActiveTab]     = useState<TabId>("dashboard");

  const [deals, setDeals]             = useState<DealRun[]>([]);
  const [dri, setDri]                 = useState<DriSnapshot[]>([]);
  const [trending, setTrending]       = useState<TrendingMultiple[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [loadingMkt, setLoadingMkt]     = useState(true);

  const [dealStatuses, setDealStatuses] = useState<Record<string, DealStatus>>({});
  const [favorites, setFavorites]       = useState<Set<string>>(new Set());
  const [notesDeal, setNotesDeal]       = useState<DealRun | null>(null);
  const [dealNotes, setDealNotes]       = useState<Record<string, DealNote[]>>({});
  const [dealIntel, setDealIntel]       = useState<Record<string, DealIntel>>({});
  // ── New modal/panel state ─────────────────────────────────────────────────
  const [analyzeModal, setAnalyzeModal]         = useState(false);
  const [detailDeal, setDetailDeal]             = useState<DealRun | null>(null);
  const [underwritingDeal, setUnderwritingDeal] = useState<DealRun | null>(null);

  const isPro       = profile?.plan === "pro" || profile?.plan === "premium";
  const userInitial = user?.email?.charAt(0)?.toUpperCase() ?? "?";

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
      setLoadingUser(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // ── Profile ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("id,email,plan").eq("id", user.id).single()
      .then(({ data }) => setProfile(data as Profile));
  }, [user]);

  // ── Deals ───────────────────────────────────────────────────────────────────
  const fetchDeals = useCallback(async (uid: string) => {
    setLoadingDeals(true);
    const { data } = await supabase
      .from("deal_runs")
      .select("id,tool_used,industry,asking_price,fair_value,valuation_multiple,dscr,overall_score,risk_level,city,state,created_at,confidence_grade")
      .eq("user_id", uid)
      .eq("is_valid", true)
      .order("created_at", { ascending: false })
      .limit(50);
    const enriched: DealRun[] = (data || []).map(d => {
      const gap_pct = d.fair_value > 0
        ? Math.round(((d.asking_price - d.fair_value) / d.fair_value) * 100)
        : 0;
      const enriched = { ...d, gap_pct, signal: deriveSignal(gap_pct) };
      return { ...enriched, verdict: dealVerdict(enriched), oppScore: oppScore(enriched) };
    });
    setDeals(enriched);
    setLoadingDeals(false);
  }, []);

  // ── Favorites ───────────────────────────────────────────────────────────────
  const fetchFavorites = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("deal_favorites")
      .select("deal_id")
      .eq("user_id", uid);
    setFavorites(new Set((data || []).map((r: any) => r.deal_id)));
  }, []);

  const toggleFavorite = useCallback(async (dealId: string) => {
    if (!user) return;
    const isFav = favorites.has(dealId);
    // Optimistic update
    setFavorites(prev => {
      const next = new Set(prev);
      isFav ? next.delete(dealId) : next.add(dealId);
      return next;
    });
    if (isFav) {
      await supabase.from("deal_favorites").delete().eq("user_id", user.id).eq("deal_id", dealId);
    } else {
      await supabase.from("deal_favorites").upsert(
        { user_id: user.id, deal_id: dealId },
        { onConflict: "user_id,deal_id" }
      );
    }
  }, [user, favorites]);

  // ── Notes panel ─────────────────────────────────────────────────────────────
  const openNotes = useCallback(async (deal: DealRun) => {
    setNotesDeal(deal);
    // Fetch notes if not already loaded
    if (!dealNotes[deal.id]) {
      const { data } = await supabase
        .from("deal_notes")
        .select("id,deal_id,content,status_tag,created_at")
        .eq("deal_id", deal.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setDealNotes(prev => ({ ...prev, [deal.id]: (data as DealNote[]) || [] }));
    }
    // Check for cached intelligence
    if (!dealIntel[deal.id]) {
      const { data: intelData } = await supabase
        .from("deal_intelligence")
        .select("*")
        .eq("deal_id", deal.id)
        .eq("user_id", user.id)
        .single();
      if (intelData) {
        setDealIntel(prev => ({ ...prev, [deal.id]: intelData as DealIntel }));
      }
    }
  }, [user, dealNotes, dealIntel]);

  const handleNoteAdded = useCallback((note: DealNote) => {
    setDealNotes(prev => ({
      ...prev,
      [note.deal_id]: [note, ...(prev[note.deal_id] ?? [])],
    }));
  }, []);

  const handleNoteDeleted = useCallback((noteId: string) => {
    if (!notesDeal) return;
    setDealNotes(prev => ({
      ...prev,
      [notesDeal.id]: (prev[notesDeal.id] ?? []).filter(n => n.id !== noteId),
    }));
  }, [notesDeal]);

  const handleIntelGenerated = useCallback((intel: DealIntel) => {
    if (!notesDeal) return;
    setDealIntel(prev => ({ ...prev, [notesDeal.id]: intel }));
  }, [notesDeal]);

  // ── Market data ─────────────────────────────────────────────────────────────
  const fetchMarket = useCallback(async () => {
    setLoadingMkt(true);
    const { data: driRaw } = await supabase
      .from("dri_snapshots")
      .select("industry_key,dri,gap_pct,condition,deal_count,listing_multiple,snapshot_date")
      .order("snapshot_date", { ascending: false })
      .limit(120);
    const seen = new Set<string>();
    const latest: DriSnapshot[] = [];
    for (const r of (driRaw || [])) {
      if (!seen.has(r.industry_key)) { seen.add(r.industry_key); latest.push(r); }
    }
    setDri(latest.sort((a, b) => (b.gap_pct ?? 0) - (a.gap_pct ?? 0)));

    const { data: bm } = await supabase
      .from("dealstats_benchmarks")
      .select("industry_key,median_multiple,sample_size")
      .eq("size_band", "mid")
      .order("sample_size", { ascending: false })
      .limit(12);
    setTrending(bm || []);
    setLoadingMkt(false);
  }, []);

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user) { fetchDeals(user.id); fetchFavorites(user.id); }
    else setLoadingDeals(false);
  }, [user, fetchDeals, fetchFavorites]);

  useEffect(() => { fetchMarket(); }, [fetchMarket]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleStatusChange = (id: string, status: DealStatus) => {
    setDealStatuses(prev => ({ ...prev, [id]: status }));
  };

  // ── New deal saved from modal → prepend to deals state immediately ────────
  const handleDealSaved = (deal: DealRun) => {
    // Enrich with verdict + oppScore before adding to state
    const enriched = { ...deal, verdict: dealVerdict(deal), oppScore: oppScore(deal) };
    setDeals(prev => [enriched, ...prev]);
    setAnalyzeModal(false);
  };

  // ── Open underwriting panel ───────────────────────────────────────────────
  const openUnderwriting = (deal: DealRun) => setUnderwritingDeal(deal);

  // ── Open deal detail panel ────────────────────────────────────────────────
  const openDetail = (deal: DealRun) => setDetailDeal(deal);

  const TABS: { id: TabId; label: string }[] = [
    { id: "dashboard",    label: "Dashboard"   },
    { id: "my-deals",     label: "My Deals"    },
    { id: "compare",      label: "Compare"     },
    { id: "market-intel", label: "Market Intel" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#080C13", color: "#E2E8F0", fontFamily: "'Inter',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box }
        select { cursor: pointer; appearance: none }
        select:focus { outline: none }
        input:focus  { outline: none; border-color: rgba(99,102,241,0.4) !important }
        textarea:focus { outline: none; border-color: rgba(99,102,241,0.4) !important }
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
        @keyframes pulse   { 0%, 100% { opacity: 1 } 50% { opacity: 0.3 } }
        .tab-content { animation: fadeUp 0.25s ease-out }
        .btn-action  { transition: opacity 0.12s }
        .btn-action:hover { opacity: 0.85 }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(8,12,19,0.95)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto", padding: "0 24px",
          display: "flex", alignItems: "center", height: 54,
        }}>
          {/* Logo */}
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 2, marginRight: 40, flexShrink: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.02em" }}>NexTax</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#6366F1", fontFamily: "'Inter Tight',sans-serif" }}>.AI</span>
          </a>

          {/* Tab buttons */}
          <div style={{ display: "flex", gap: 2, flex: 1 }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  position: "relative", padding: "6px 14px", borderRadius: 8, border: "none",
                  background: activeTab === tab.id ? "rgba(99,102,241,0.12)" : "transparent",
                  color: activeTab === tab.id ? "#C4B5FD" : "#4B5563",
                  fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div style={{
                    position: "absolute", bottom: -1, left: "50%",
                    transform: "translateX(-50%)",
                    width: 20, height: 2, borderRadius: 1, background: "#6366F1",
                  }} />
                )}
                {tab.id === "compare" && !isPro && (
                  <span style={{ marginLeft: 4, fontSize: 9, color: "#374151" }}>🔒</span>
                )}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {favorites.size > 0 && (
              <span style={{ fontSize: 11, color: "#F59E0B" }}>★ {favorites.size}</span>
            )}
            {isPro ? (
              <div style={{
                padding: "3px 10px", borderRadius: 20,
                background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
                fontSize: 11, color: "#818CF8", fontWeight: 700, letterSpacing: "0.04em",
              }}>
                ⚡ PRO
              </div>
            ) : (
              <div style={{
                padding: "3px 10px", borderRadius: 20,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                fontSize: 11, color: "#4B5563", fontWeight: 600,
              }}>
                Free
              </div>
            )}
            {user ? (
              <div
                onClick={() => supabase.auth.signOut().then(() => { window.location.href = "/login"; })}
                title={`${user.email} — click to sign out`}
                style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: "#fff",
                  cursor: "pointer", flexShrink: 0,
                }}
              >
                {userInitial}
              </div>
            ) : (
              <a
                href="/login"
                style={{
                  padding: "5px 12px", borderRadius: 8,
                  border: "1px solid rgba(99,102,241,0.25)",
                  background: "rgba(99,102,241,0.08)",
                  color: "#818CF8", fontSize: 12, fontWeight: 500, textDecoration: "none",
                }}
              >
                Sign In
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* ── AUTH GATE ── */}
      {!loadingUser && !user && <SignInRequired />}
      {loadingUser && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div style={{ fontSize: 13, color: "#374151" }}>Loading...</div>
        </div>
      )}

      {/* ── AUTHENTICATED CONTENT ── */}
      {!loadingUser && user && (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 60px" }}>

          {/* Hero row */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "flex-end",
            marginBottom: 24, flexWrap: "wrap", gap: 16,
          }}>
            <div>
              <div style={{
                fontSize: 10, color: "#374151", textTransform: "uppercase",
                letterSpacing: "0.1em", fontWeight: 600, marginBottom: 6,
              }}>
                {TABS.find(t => t.id === activeTab)?.label}
              </div>
              <h1 style={{
                fontSize: "clamp(20px,2.5vw,28px)", fontWeight: 700, margin: 0,
                fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.02em", color: "#F1F5F9",
              }}>
                {activeTab === "dashboard"    && "Deal Command Center"}
                {activeTab === "my-deals"     && "My Deals"}
                {activeTab === "compare"      && "Compare Deals"}
                {activeTab === "market-intel" && "Market Intelligence"}
              </h1>
            </div>
            <button
              onClick={() => setAnalyzeModal(true)}
              className="btn-action"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "9px 18px", borderRadius: 9, border: "none",
                background: "linear-gradient(135deg,#3B82F6,#6366F1)",
                color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 14 }}>+</span> Analyze New Deal
            </button>
          </div>

          {/* Stat cards — dashboard + my-deals only */}
          {(activeTab === "dashboard" || activeTab === "my-deals") && (
            <StatCards deals={deals} loading={loadingDeals} />
          )}

          {/* Tab content */}
          <div className="tab-content">
            {activeTab === "dashboard" && (
              <TabDashboard
                deals={deals}
                dri={dri}
                trending={trending}
                loading={loadingDeals}
                loadingMkt={loadingMkt}
                isPro={isPro}
                favorites={favorites}
                onTabChange={setActiveTab}
                onToggleFav={toggleFavorite}
                onOpenNotes={openNotes}
                onOpenDetail={openDetail}
                onOpenUnderwriting={openUnderwriting}
                onAnalyzeNew={() => setAnalyzeModal(true)}
              />
            )}
            {activeTab === "my-deals" && (
              <TabMyDeals
                deals={deals}
                loading={loadingDeals}
                isPro={isPro}
                dealStatuses={dealStatuses}
                favorites={favorites}
                onStatusChange={handleStatusChange}
                onToggleFav={toggleFavorite}
                onOpenNotes={openNotes}
                onOpenDetail={openDetail}
                onOpenUnderwriting={openUnderwriting}
                onAnalyzeNew={() => setAnalyzeModal(true)}
              />
            )}
            {activeTab === "compare" && (
              <TabCompare deals={deals} isPro={isPro} onAnalyzeNew={() => setAnalyzeModal(true)} />
            )}
            {activeTab === "market-intel" && (
              <TabMarketIntel dri={dri} trending={trending} loading={loadingMkt} isPro={isPro} deals={deals} />
            )}
          </div>
        </div>
      )}

      {/* ── NOTES PANEL (portal overlay) ── */}
      {notesDeal && user && (
        <NotesPanel
          deal={notesDeal}
          userId={user.id}
          isPro={isPro}
          notes={dealNotes[notesDeal.id] ?? []}
          intel={dealIntel[notesDeal.id] ?? null}
          onClose={() => setNotesDeal(null)}
          onNoteAdded={handleNoteAdded}
          onNoteDeleted={handleNoteDeleted}
          onStatusChange={handleStatusChange}
          dealStatuses={dealStatuses}
          onIntelGenerated={handleIntelGenerated}
        />
      )}

      {/* ── ANALYZE DEAL MODAL ── */}
      {analyzeModal && user && (
        <AnalyzeDealModal
          userId={user.id}
          isPro={isPro}
          onClose={() => setAnalyzeModal(false)}
          onDealSaved={handleDealSaved}
        />
      )}

      {/* ── DEAL DETAIL PANEL ── */}
      {detailDeal && (
        <DealDetailPanel
          deal={detailDeal}
          favorites={favorites}
          dealStatuses={dealStatuses}
          isPro={isPro}
          onClose={() => setDetailDeal(null)}
          onToggleFav={toggleFavorite}
          onOpenNotes={(deal) => { openNotes(deal); setDetailDeal(null); }}
          onOpenUnderwriting={(deal) => { setUnderwritingDeal(deal); setDetailDeal(null); }}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* ── UNDERWRITING PANEL ── */}
      {underwritingDeal && (
        <UnderwritingPanel
          deal={underwritingDeal}
          isPro={isPro}
          onClose={() => setUnderwritingDeal(null)}
        />
      )}
    </div>
  );
}
