"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { CATEGORIES } from "@/lib/marketview/categories";
import { normalizeDealFinancials } from "@/lib/normalizationEngine";
import { BlurGateSection, ProLockedBanner } from "@/components/BlurGateSection";
import { getDscrRange } from "@/lib/dscrRanges";
import { LenderReadinessTab } from "@/components/LenderReadinessTab";
import { buildLenderReadiness } from "@/lib/lenderReadiness";
import { DealMemoTab } from "@/components/DealMemoTab";
import { buildRiskFlags, buildDiligenceQuestions, buildDecisionTriggers } from "@/lib/dealMemo";
import { INDUSTRY_FIT } from "@/lib/lenderReadiness";
import { LoiBuilderTab } from "@/components/LoiBuilderTab";
import { buildLoiRecommendation } from "@/lib/loiBuilder";
import { TrustBadge } from "@/components/TrustBadge";
import { TrajectoryChip, TrajectoryBreakdown } from "@/components/TrajectoryIndicator";
import { buildTrajectory } from "@/lib/dealTrajectory";
import { OutcomeModal } from "@/components/OutcomeModal";
import { fetchOutcomesForUser, OUTCOME_LABELS, OUTCOME_COLORS, type DealOutcome } from "@/lib/dealOutcomes";
import { InfoTooltip } from "@/components/InfoTooltip";
import { SampleMemoPreviewModal } from "@/components/SampleMemoPreviewModal";
import {
  CompsTab,
  type CompsTabProps,
  type BenchmarkContext,
  type MarketPosition,
  type NormalizationContext,
  type CompsData,
  type DecisionContext,
  type PricingLabel,
  type VerdictLabel,
} from "@/components/CompsTab";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── TYPES ───────────────────────────────────────────────────────────────────

type TabId       = "home" | "dashboard" | "my-deals" | "compare" | "market-intel";
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
  // ── Benchmark-aware scoring ──────────────────────────────────────────────
  marginScore?:      number;
  benchmarkSource?:  "rma" | "fallback";
  benchmark_family?: string | null;
  // ── Normalization layer (V2) ──────────────────────────────────────────────
  reported_sde?:                  number | null;
  usable_sde?:                    number | null;
  benchmark_implied_sde?:         number | null;
  earnings_source?:               "reported" | "blended" | "benchmark_implied" | null;
  normalization_trust_score?:     number | null;
  normalization_confidence_level?: "high" | "medium" | "low" | null;
  normalization_flags_json?:      any[] | null;
  normalization_adjustments_json?: any[] | null;
  manual_review_required?:        boolean | null;
  benchmark_is_proxy?:            boolean | null;
  earnings_basis?:                "reported" | "blended" | "benchmark_implied" | null;
  scoreExplanation?: string[];         // from generateScoreExplanation()
  rmaBenchmarks?: {
    ebitdaMarginPct:    number | null;
    operatingMarginPct: number | null;
    currentRatio:       number | null;
    debtToEquity:       number | null;
    interestCoverage:   number | null;
    leverageFlag:       string | null;
    coverageFlag:       string | null;
  } | null;
  /** Evidence profile — populated for deals saved after the evidence-profile rollout.
   *  Older deals have this as null/undefined and the UI falls back to legacy flag logic.
   *  Shape matches DealEvidenceProfile (see interface below). */
  evidence_profile?: {
    addBackAmount:        number;
    addBackPct:           number;
    addBackBand:          "clean" | "moderate" | "elevated" | "aggressive";
    addBackMessage:       string;
    concentrationBasis:   "hard" | "soft" | "none";
    topCustomerPct:       number | null;
    concentrationBand:    "low" | "moderate" | "high" | "unknown";
    concentrationMessage: string;
  } | null;
}

/** Deal Verdict — the single opinionated label shown throughout the UI */
type DealVerdict = "high_conviction" | "pursue" | "investigate" | "pass" | "manual_review";

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
  industry_key:     string;
  median_multiple:  number;   // SDE multiple (mvic_to_sde) — primary
  revenue_multiple: number | null;   // MVIC-to-revenue cross-reference
  p25_sde_multiple: number | null;   // 25th percentile SDE multiple
  p75_sde_multiple: number | null;   // 75th percentile SDE multiple
  sample_size:      number;
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
  gasstation:      "Gas Station",
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

  // ── Conviction cap — normalization trust gate ─────────────────────────────
  // Low-trust verdicts are review-oriented, not investment-oriented.
  // "manual_review" = data quality is the blocker (not deal quality)
  // "investigate"   = trust partially low but deal still worth validating
  const trustScore    = d.normalization_trust_score ?? 100;
  const manualReview  = d.manual_review_required    ?? false;
  if (manualReview || trustScore < 45) {
    // Critical trust failure — always show as manual review needed
    return "manual_review";
  }
  if (trustScore < 60) {
    // Low trust — cap at investigate (never show pursue or high_conviction)
    if (gp >= 15 || d.dscr < 1.25 || isHighRisk) return "investigate";
    return "investigate";
  }

  // 🔥 High Conviction
  if (gp <= -30 && d.dscr >= 2.5 && d.overall_score >= 85 && rl === "low") {
    return "high_conviction";
  }
  // 🔴 Pass
  if (gp >= 15 || d.dscr < 1.25 || isHighRisk) return "pass";
  // 🟢 Pursue
  if ((gp <= -20 && d.dscr >= 1.75) || (d.overall_score >= 80 && gp <= -10)) return "pursue";
  // 🟡 Investigate
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
    case "manual_review": return {
      emoji: "⚠️", label: "Needs Manual Review",
      color: "#F97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.28)",
      subtext: "Data quality flags require manual review before any verdict can be issued. Verify financials before advancing.",
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
        {sub && <p style={{ fontSize: 11, color: "#7C8593", margin: 0 }}>{sub}</p>}
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
  const sc     = sigCfg(deal.signal ?? "fair");
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
              <div style={{ fontSize: 11, color: "#7C8593" }}>
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
                background: "none", border: "none", color: "#7C8593",
                fontSize: 20, cursor: "pointer", padding: "2px 6px", lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* Status dropdown */}
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "#7C8593" }}>Status:</span>
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
            fontSize: 10, fontWeight: 600, color: "#7C8593",
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
                color: noteText.trim() ? "#fff" : "#6B7280",
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
              fontSize: 10, fontWeight: 600, color: "#6B7280",
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
            <div style={{ textAlign: "center", padding: "20px 0", color: "#6B7280", fontSize: 12 }}>
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
                          background: "none", border: "none", color: "#6B7280",
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
                <div style={{ fontSize: 12, color: "#7C8593", marginBottom: 14, lineHeight: 1.6 }}>
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
                <div style={{ fontSize: 10, color: "#6B7280", textAlign: "center", marginTop: 4 }}>
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
              <div style={{ fontSize: 11, color: "#7C8593", marginBottom: 12 }}>
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
              onClick={() => onOpenUnderwriting(deal)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "13px 16px", borderRadius: 12,
                background: isTop ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.02)",
                border: isTop ? "1px solid rgba(16,185,129,0.15)" : "1px solid rgba(255,255,255,0.06)",
                cursor: "pointer", transition: "background 0.12s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = isTop ? "rgba(16,185,129,0.07)" : "rgba(99,102,241,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = isTop ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.02)")}
            >
              {/* Rank badge */}
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: isTop ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700,
                color: isTop ? "#10B981" : "#7C8593",
                flexShrink: 0, fontFamily: "'JetBrains Mono',monospace",
              }}>
                {i + 1}
              </div>

              <Ring score={deal.overall_score} size={32} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#F1F5F9" }}>
                  {IL[deal.industry] || deal.industry}
                </div>
                <div style={{ fontSize: 11, color: "#7C8593", marginTop: 1 }}>
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

              {/* Actions — all stop propagation; row itself triggers underwriting */}
              <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                <StarButton dealId={deal.id} favorites={favorites} onToggle={onToggleFav} />
                <button onClick={(e) => { e.stopPropagation(); onOpenNotes(deal); }} title="Notes & Intel"
                  style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, cursor: "pointer", padding: "5px 8px", fontSize: 12, color: "#7C8593" }}>
                  📝
                </button>
                <button onClick={(e) => { e.stopPropagation(); onOpenDetail(deal); }} title="Quick View"
                  className="btn-qv"
                  style={{ padding: "5px 9px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#6B7280", fontSize: 11, cursor: "pointer" }}>
                  Quick View
                </button>
                <button onClick={(e) => { e.stopPropagation(); onOpenUnderwriting(deal); }} title="Open Underwriting"
                  className="btn-uw"
                  style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(99,102,241,0.35)", background: "rgba(99,102,241,0.12)", color: "#A5B4FC", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as any }}>
                  Open Underwriting →
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
                <div style={{ fontSize: 11, color: "#6B7280" }}>
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
                    color: "#7C8593", fontSize: 11, cursor: "pointer",
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
  gasstation:     { label:"Gas Station / C-Store", benchmarkLow:2.5, benchmarkMid:3.20, benchmarkHigh:4.5,  marginRange:[3,8],   growth:"Stable",   riskFactor:0.85, demandScore:58, buyerInterestRank:13, competitionLevel:"Moderate"      },
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
  topCustomerPct: string;   // Optional — enables HARD concentration flag vs SOFT (inferred)
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
  normalizationTrustScore: number | null;
  normalizationBullets:    string[];
  benchmarkBasis:          "direct" | "proxy" | "fallback";
  resolvedMarginMid:       number | null;
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
  /** Evidence profile — separates HARD (data-backed) from SOFT (inferred) flags. */
  evidenceProfile?: DealEvidenceProfile;
}

/**
 * Evidence profile — explicit, auditable basis for concentration + add-back language.
 *
 * Key design principle: every flag is tagged with its evidentiary basis.
 *   - "hard" = driven by a user-provided data point (defensible, specific)
 *   - "soft" = inferred from model heuristics (requires validation)
 *
 * This lets the memo say "Top customer = 32%" (hard) OR "Concentration risk inferred"
 * (soft) — never faking precision where none exists.
 */
interface DealEvidenceProfile {
  // ── Add-back analysis ────────────────────────────────────────────────────
  addBackAmount:  number;           // reported SDE - adjusted SDE
  addBackPct:     number;           // addBackAmount / reportedSDE (0–1 range)
  addBackBand:    "clean" | "moderate" | "elevated" | "aggressive";
  addBackMessage: string;           // one-line underwriter-voice summary
  // ── Customer concentration ──────────────────────────────────────────────
  concentrationBasis: "hard" | "soft" | "none";
  topCustomerPct:     number | null;   // only set if user provided it
  concentrationBand:  "low" | "moderate" | "high" | "unknown";
  concentrationMessage: string;
}

/**
 * Build the evidence profile for a deal — add-back analysis + concentration band.
 *
 * This powers the memo's HARD vs SOFT flag language. Every field here is either:
 *   - computed from real inputs (hard evidence), OR
 *   - explicitly tagged as inferred (soft evidence requiring validation)
 *
 * Never fake precision. Language must always reflect the evidentiary basis.
 */
function buildEvidenceProfile(params: {
  reportedSDE:    number;
  adjustedSDE:    number;
  revenue:        number;
  industryMarginMidpoint: number | null;   // benchmark SDE margin for this industry (0–1)
  topCustomerPct: number | null;            // user-provided, or null
}): DealEvidenceProfile {
  const { reportedSDE, adjustedSDE, revenue, industryMarginMidpoint, topCustomerPct } = params;

  // ─── Add-back analysis ────────────────────────────────────────────────────
  const addBackAmount = Math.max(0, reportedSDE - adjustedSDE);
  const addBackPct    = reportedSDE > 0 ? addBackAmount / reportedSDE : 0;

  let addBackBand:    DealEvidenceProfile["addBackBand"];
  let addBackMessage: string;
  const pctStr = `${(addBackPct * 100).toFixed(0)}%`;

  if (addBackPct < 0.10) {
    addBackBand    = "clean";
    addBackMessage = addBackAmount === 0
      ? "No material normalization adjustments applied — reported SDE used as underwriting basis."
      : `Add-backs (~${pctStr} of reported SDE) are within clean underwriting tolerance.`;
  } else if (addBackPct < 0.20) {
    addBackBand    = "moderate";
    addBackMessage = `Add-backs (~${pctStr} of reported SDE) sit within typical range but require validation with tax returns and bank statements.`;
  } else if (addBackPct < 0.35) {
    addBackBand    = "elevated";
    addBackMessage = `Add-backs (~${pctStr} of reported SDE) exceed typical underwriting tolerance — lenders will require substantiation before approval.`;
  } else {
    addBackBand    = "aggressive";
    addBackMessage = `Add-backs (~${pctStr} of reported SDE) materially inflate earnings — high likelihood of lender re-adjustment downward.`;
  }

  // ─── Customer concentration ──────────────────────────────────────────────
  let concentrationBasis:   DealEvidenceProfile["concentrationBasis"];
  let concentrationBand:    DealEvidenceProfile["concentrationBand"];
  let concentrationMessage: string;

  if (topCustomerPct != null && topCustomerPct > 0) {
    // HARD evidence — user provided the number
    concentrationBasis = "hard";
    if (topCustomerPct >= 30) {
      concentrationBand    = "high";
      concentrationMessage = `Top customer represents ${topCustomerPct.toFixed(0)}% of revenue — material concentration risk. Loss of this account would likely impair debt service capacity.`;
    } else if (topCustomerPct >= 20) {
      concentrationBand    = "moderate";
      concentrationMessage = `Top customer represents ${topCustomerPct.toFixed(0)}% of revenue — concentration is elevated and will attract lender scrutiny.`;
    } else {
      concentrationBand    = "low";
      concentrationMessage = `Top customer represents ${topCustomerPct.toFixed(0)}% of revenue — within acceptable diversification range.`;
    }
  } else {
    // SOFT evidence — infer from margin signal if possible
    // High margin for the industry can hint at a hidden concentration premium,
    // but we MUST frame this as inferred, not factual.
    const actualMargin = revenue > 0 ? adjustedSDE / revenue : 0;
    const benchMargin  = industryMarginMidpoint ?? 0;
    const marginAbove  = benchMargin > 0 && actualMargin > benchMargin * 1.5;

    if (marginAbove) {
      concentrationBasis   = "soft";
      concentrationBand    = "unknown";
      concentrationMessage = "SDE margin materially exceeds industry benchmark — may indicate a concentrated customer base or pricing advantage. Requires validation via customer breakdown.";
    } else {
      concentrationBasis   = "none";
      concentrationBand    = "unknown";
      concentrationMessage = "Customer concentration not disclosed — request top-10 customer breakdown during diligence.";
    }
  }

  return {
    addBackAmount, addBackPct, addBackBand, addBackMessage,
    concentrationBasis, topCustomerPct, concentrationBand, concentrationMessage,
  };
}

function computeModalScore(
  inputs: ModalDealInputs,
  resolvedBenchmark?: { ebitdaMarginPct: number; isProxy: boolean; basis: "direct" | "proxy" | "fallback" } | null,
): ModalScore | null {
  const revenue = parseFloat(inputs.revenue.replace(/,/g, ""));
  const sdeRaw  = parseFloat(inputs.sde.replace(/,/g, ""));
  const price   = parseFloat(inputs.askingPrice.replace(/,/g, ""));

  // ── Normalization: compute usableSDE before any downstream calculation ─────
  // Falls back to sdeRaw if normalization is unavailable.
  let sde = sdeRaw;
  let normalizationTrustScore: number | null = null;
  let normalizationBullets: string[] = [];
  let rmaBenchmarksForNorm: { ebitdaMarginPct: number } | null = null;
  try {
    // Pass ebitda = sdeRaw (not *0.9) so allIdentical fires when revenue=sde=ebitda.
    const ebitdaInput = sdeRaw;

    // ── Benchmark resolution (priority order) ────────────────────────────────
    // 1. Real RMA data if fetched async before computeModalScore (resolvedBenchmark)
    // 2. SCORE_INDUSTRIES marginRange midpoint as fallback
    const indData = SCORE_INDUSTRIES[inputs.industry];

    if (resolvedBenchmark?.ebitdaMarginPct) {
      // Priority 1 & 2: real RMA or proxy (fetched async before this call)
      rmaBenchmarksForNorm = { ebitdaMarginPct: resolvedBenchmark.ebitdaMarginPct };
    } else {
      // Priority 3: fallback to SCORE_INDUSTRIES midpoint
      const midpoint = indData
        ? (indData.marginRange[0] + indData.marginRange[1]) / 2 / 100
        : null;
      rmaBenchmarksForNorm = midpoint ? { ebitdaMarginPct: midpoint } : null;
    }

    const normalized = normalizeDealFinancials({
      revenue, sde: sdeRaw, ebitda: ebitdaInput, price,
      benchmarkFamily: inputs.industry,
      benchmarkIsProxy: resolvedBenchmark?.isProxy ?? false,
      dataSource: "manual_entry",
      rmaBenchmarks: rmaBenchmarksForNorm,
    });
    sde = normalized.earnings.usableSDE;
    normalizationTrustScore = normalized.trustScore;
    normalizationBullets = normalized.flags
      .filter((f: any) => f.deduction > 0)
      .map((f: any) => f.message);
  } catch { /* normalization is additive — never block scoring */ }
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
  else greenFlags.push(`${multiple.toFixed(2)}x is within the ${benchmarkLow.toFixed(2)}–${benchmarkHigh.toFixed(2)}x typical benchmark range`);
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

  if (dscr < 1.25) redFlags.push(
    dscr < 0.75
      ? `DSCR of ${dscr.toFixed(2)}x — cannot support debt (well below the 1.25x lender minimum)`
      : dscr < 1.0
      ? `DSCR of ${dscr.toFixed(2)}x — insufficient to cover debt service (below 1.25x lender minimum)`
      : `DSCR of ${dscr.toFixed(2)}x is below the 1.25x lender minimum — deal may not qualify for financing`
  );
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

  // Build the evidence profile — auditable basis for concentration + add-back language
  const topCustomerPctNum = parseFloat((inputs.topCustomerPct || "").replace(/[^0-9.]/g, ""));
  const evidenceProfile = buildEvidenceProfile({
    reportedSDE:            sdeRaw,
    adjustedSDE:            sde,
    revenue,
    industryMarginMidpoint: rmaBenchmarksForNorm?.ebitdaMarginPct ?? null,
    topCustomerPct:         isFinite(topCustomerPctNum) && topCustomerPctNum > 0 ? topCustomerPctNum : null,
  });

  return {
    overall, riskLevel, fairValue, fairValueLow, fairValueHigh, multiple,
    dscr, monthlyPayment, gap_pct, signal,
    recommendedOfferLow, recommendedOfferHigh,
    redFlags, greenFlags,
    valuationScore, debtScore, marketScore, industryScore,
    normalizationTrustScore,
    normalizationBullets,
    benchmarkBasis:    resolvedBenchmark?.basis ?? "fallback",
    resolvedMarginMid: rmaBenchmarksForNorm?.ebitdaMarginPct ?? null,
    evidenceProfile,
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
    topCustomerPct: "",
  });
  const [score, setScore]     = useState<ModalScore | null>(null);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Input validation — prevents nonsense verdicts from garbage input ──────
  // Parse a locale-formatted currency string ("1,500,000") back to a number
  const parseNum = (s: string): number => {
    if (!s) return 0;
    const n = parseFloat(String(s).replace(/[^0-9.-]/g, ""));
    return isFinite(n) ? n : 0;
  };

  // Produce a prioritized list of validation issues. Errors block submission;
  // warnings allow submission but surface a caution banner.
  type ValidationIssue = { severity: "error" | "warning"; field?: keyof ModalDealInputs; message: string };
  const validateInputs = (): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const revenue = parseNum(inputs.revenue);
    const sde     = parseNum(inputs.sde);
    const ask     = parseNum(inputs.askingPrice);

    // ── Hard errors (block) ────────────────────────────────────────────────
    if (inputs.revenue && revenue < 10_000) {
      issues.push({ severity: "error", field: "revenue", message: "Revenue appears too low — confirm you entered the full annual amount (not monthly)." });
    }
    if (inputs.revenue && revenue > 1_000_000_000) {
      issues.push({ severity: "error", field: "revenue", message: "Revenue exceeds $1B — this tool is designed for SMB acquisitions under $100M in revenue." });
    }
    if (inputs.sde && sde <= 0) {
      issues.push({ severity: "error", field: "sde", message: "SDE must be positive. Unprofitable businesses cannot be meaningfully scored by this model." });
    }
    if (inputs.askingPrice && ask < 10_000) {
      issues.push({ severity: "error", field: "askingPrice", message: "Asking price appears too low — confirm the full amount." });
    }

    // SDE > Revenue is structurally impossible (SDE is a subset of revenue)
    if (revenue > 0 && sde > 0 && sde > revenue) {
      issues.push({ severity: "error", field: "sde", message: "SDE cannot exceed revenue — check your inputs. SDE is cash flow before owner draws; it is always less than revenue." });
    }

    // Multiple sanity — the critical check
    if (sde > 0 && ask > 0) {
      const multiple = ask / sde;
      if (multiple > 20) {
        issues.push({
          severity: "error",
          field:    "sde",
          message:  `Asking price is ${multiple.toFixed(1)}x SDE — far above typical SMB valuations (usually 2–6x). Double-check your SDE and asking price.`,
        });
      } else if (multiple > 10) {
        issues.push({
          severity: "warning",
          field:    "sde",
          message:  `Multiple of ${multiple.toFixed(1)}x SDE is well above typical SMB range. Proceed if confirmed, but verify inputs.`,
        });
      } else if (multiple < 0.5) {
        issues.push({
          severity: "error",
          field:    "sde",
          message:  `Asking price is ${multiple.toFixed(2)}x SDE — implausibly low. Check for transposed values.`,
        });
      }
    }

    // Revenue / SDE sanity — flags typos in one of the two fields
    if (revenue > 0 && sde > 0) {
      const margin = (sde / revenue) * 100;
      if (margin > 75) {
        issues.push({
          severity: "warning",
          field:    "sde",
          message:  `SDE margin of ${margin.toFixed(0)}% is unusually high. Most SMBs run 10–30% SDE margins — verify this is realistic for the business.`,
        });
      } else if (margin < 2 && revenue > 100_000) {
        issues.push({
          severity: "warning",
          field:    "sde",
          message:  `SDE margin of ${margin.toFixed(1)}% is very thin. Most SMBs run 10–30% — confirm SDE is correct.`,
        });
      }
    }

    // Top customer % sanity — optional, but must be valid if provided
    if (inputs.topCustomerPct) {
      const tc = parseNum(inputs.topCustomerPct);
      if (tc < 0 || tc > 100) {
        issues.push({ severity: "error", field: "topCustomerPct", message: "Top customer % must be between 0 and 100." });
      } else if (tc === 0 && inputs.topCustomerPct !== "") {
        issues.push({ severity: "warning", field: "topCustomerPct", message: "Top customer 0% is unusual — most SMBs have at least some concentration." });
      }
    }

    // Debt term sanity
    const dp   = parseNum(inputs.debtPercent);
    const rate = parseNum(inputs.interestRate);
    const term = parseNum(inputs.termYears);
    if (inputs.debtPercent && (dp < 0 || dp > 100)) {
      issues.push({ severity: "error", field: "debtPercent", message: "Debt % must be between 0 and 100." });
    }
    if (inputs.interestRate && (rate < 0 || rate > 30)) {
      issues.push({ severity: "error", field: "interestRate", message: "Interest rate appears outside realistic range (0–30%)." });
    }
    if (inputs.termYears && (term < 1 || term > 30)) {
      issues.push({ severity: "error", field: "termYears", message: "Loan term should be between 1 and 30 years." });
    }

    return issues;
  };

  const validationIssues = validateInputs();
  const hasErrors        = validationIssues.some(i => i.severity === "error");
  const hasWarnings      = validationIssues.some(i => i.severity === "warning");
  const [acknowledgedWarnings, setAcknowledgedWarnings] = useState(false);
  // Reset acknowledgement if the user changes inputs
  React.useEffect(() => { setAcknowledgedWarnings(false); }, [inputs.revenue, inputs.sde, inputs.askingPrice]);

  const set = (k: keyof ModalDealInputs, v: string) => setInputs(p => ({ ...p, [k]: v }));
  const setCurr = (k: keyof ModalDealInputs, v: string) => {
    const n = v.replace(/[^0-9]/g, "");
    set(k, n ? parseInt(n).toLocaleString() : "");
  };

  const hasAllFields = !!inputs.industry && !!inputs.revenue && !!inputs.sde && !!inputs.askingPrice;
  const canScore     = hasAllFields && !hasErrors && (!hasWarnings || acknowledgedWarnings);

  async function handleScore() {
    setLoading(true);
    // ── Step 1: Fetch real RMA benchmark (priority 1/2) ─────────────────────
    // Try /api/benchmarks?industry={key} — falls back gracefully if unavailable.
    let resolvedBenchmark: { ebitdaMarginPct: number; isProxy: boolean; basis: "direct" | "proxy" | "fallback" } | null = null;
    try {
      const bmRes = await fetch(`/api/benchmarks?industry=${encodeURIComponent(inputs.industry)}`);
      if (bmRes.ok) {
        const bmJson = await bmRes.json();
        if (bmJson.benchmarks?.ebitda_margin_pct) {
          const isProxy = bmJson.source === "no_data" ? false
            : ["med_spa","behavioral_health","manufacturing","retail","wholesale"]
                .includes(inputs.industry);
          resolvedBenchmark = {
            ebitdaMarginPct: bmJson.benchmarks.ebitda_margin_pct,
            isProxy,
            basis: isProxy ? "proxy" : "direct",
          };
        }
      }
    } catch { /* network failure — fall back to SCORE_INDUSTRIES midpoint */ }

    // ── Step 2: Compute score using resolved benchmark ───────────────────────
    const result = computeModalScore(inputs, resolvedBenchmark);
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
          tool_used:            "reality_check",
          industry:             inputs.industry,
          revenue:              rev,
          sde,                                    // displayed SDE (stated)
          reported_sde:         sde,              // audit: original stated SDE
          usable_sde:           score ? Math.round(score.fairValue / ((SCORE_INDUSTRIES[inputs.industry]?.benchmarkMid) ?? 2.75)) : sde,
          normalization_trust_score: score?.normalizationTrustScore ?? null,
          benchmark_family:     inputs.industry,
          benchmark_source:     score?.benchmarkBasis ?? "fallback",
          benchmark_is_proxy:   score?.benchmarkBasis === "proxy",
          raw_multiple:         sde > 0 ? +(price / sde).toFixed(3) : null,
          normalized_multiple:  score && score.fairValue > 0
            ? +(price / Math.round(score.fairValue / ((SCORE_INDUSTRIES[inputs.industry]?.benchmarkMid) ?? 2.75))).toFixed(3)
            : null,
          normalized_margin:    rev > 0 && score
            ? +(Math.round(score.fairValue / ((SCORE_INDUSTRIES[inputs.industry]?.benchmarkMid) ?? 2.75)) / rev).toFixed(4)
            : null,
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
          evidence_profile:     score.evidenceProfile ?? null,
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
    display: "block", fontSize: 10, color: "#7C8593",
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
            <div style={{ fontSize: 11, color: "#7C8593", marginTop: 2 }}>
              {step === "input" ? "Enter deal details to score and save" : "Review score, then save to your dashboard"}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#7C8593", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "2px 6px" }}
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

              {/* Deal quality signals — optional inputs that strengthen memo precision */}
              <div style={{
                padding: "12px 14px", borderRadius: 10, marginBottom: 14,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{
                  fontSize: 10, color: "#7C8593", textTransform: "uppercase" as const, letterSpacing: "0.08em",
                  fontWeight: 600, marginBottom: 4,
                }}>
                  Deal quality signals (optional)
                </div>
                <div style={{ fontSize: 10.5, color: "#7C8593", marginBottom: 10, lineHeight: 1.5 }}>
                  Providing these replaces inferred flags with data-backed findings in the memo.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, alignItems: "center" }}>
                  <div>
                    <label style={labelStyle}>Top customer % of revenue</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="e.g. 25"
                      min={0} max={100} step={1}
                      value={inputs.topCustomerPct}
                      onChange={e => set("topCustomerPct", e.target.value)}
                      style={{ ...inputStyle, fontFamily: "'JetBrains Mono',monospace" }}
                    />
                  </div>
                  <div style={{ fontSize: 10.5, color: "#7C8593", lineHeight: 1.55, paddingTop: 14 }}>
                    If the largest customer accounts for 30%+ of revenue, expect lender scrutiny. Leave blank to flag as inferred.
                  </div>
                </div>
              </div>

              {/* Debt terms */}
              <div style={{
                padding: "12px 14px", borderRadius: 10, marginBottom: 18,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ fontSize: 10, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>
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

              {/* ── Validation banner — shown when inputs trigger issues ── */}
              {hasAllFields && validationIssues.length > 0 && (
                <div style={{
                  marginBottom: 12,
                  padding: "11px 13px",
                  borderRadius: 9,
                  background:  hasErrors ? "rgba(239,68,68,0.06)"  : "rgba(245,158,11,0.05)",
                  border:      hasErrors ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(245,158,11,0.25)",
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, marginBottom: validationIssues.length > 0 ? 8 : 0,
                  }}>
                    <span style={{ fontSize: 14 }}>{hasErrors ? "⚠" : "!"}</span>
                    <div style={{
                      fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em",
                      color: hasErrors ? "#F87171" : "#F59E0B",
                    }}>
                      {hasErrors ? "Check your inputs before scoring" : "Unusual values detected"}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 5 }}>
                    {validationIssues.map((issue, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex", gap: 8, alignItems: "flex-start",
                          fontSize: 11.5, color: "#C4C8D1", lineHeight: 1.5,
                        }}
                      >
                        <span style={{
                          color: issue.severity === "error" ? "#F87171" : "#F59E0B",
                          flexShrink: 0, fontWeight: 700, marginTop: 1,
                        }}>
                          {issue.severity === "error" ? "×" : "!"}
                        </span>
                        <span>{issue.message}</span>
                      </div>
                    ))}
                  </div>
                  {/* Warning acknowledgement — only shown if warnings exist AND no errors */}
                  {hasWarnings && !hasErrors && (
                    <label style={{
                      display: "flex", alignItems: "center", gap: 8,
                      marginTop: 10, paddingTop: 9,
                      borderTop: "1px solid rgba(245,158,11,0.18)",
                      fontSize: 11, color: "#C4C8D1", cursor: "pointer",
                    }}>
                      <input
                        type="checkbox"
                        checked={acknowledgedWarnings}
                        onChange={e => setAcknowledgedWarnings(e.target.checked)}
                        style={{ cursor: "pointer", accentColor: "#F59E0B" }}
                      />
                      <span>I've verified these inputs are correct — proceed anyway</span>
                    </label>
                  )}
                </div>
              )}

              <button
                onClick={handleScore}
                disabled={!canScore || loading}
                style={{
                  width: "100%", padding: "12px", borderRadius: 10, border: "none",
                  background: canScore ? "linear-gradient(135deg,#3B82F6,#6366F1)" : "rgba(255,255,255,0.05)",
                  color: canScore ? "#fff" : "#6B7280",
                  fontSize: 14, fontWeight: 600, cursor: canScore ? "pointer" : "not-allowed",
                }}
              >
                {loading ? "Scoring..." : !hasAllFields ? "Fill all fields to score" : hasErrors ? "Fix errors to score" : "Score This Deal →"}
              </button>
            </div>
          )}

          {/* ── STEP 2: RESULTS ── */}
          {step === "results" && score && (
            <div style={{ padding: "20px 24px" }}>

              {/* Hero row */}
              <div style={{
                display: "grid", gridTemplateColumns: "auto 1fr", gap: 20,
                padding: "16px 18px", borderRadius: 12, marginBottom: 8,
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
                      <span style={{ fontSize: 9, color: "#7C8593", marginTop: 1 }}>/ 100</span>
                    </div>
                  </div>
                  <div style={{
                    marginTop: 6, fontSize: 10, fontWeight: 700, color: scoreColor(score.overall),
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    Deal Score
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
                      <div style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{m.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono',monospace" }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Earnings basis debug banner ─────────────────────────────────────── */}
              {(() => {
                const usedSDE = Math.round(score.fairValue / ((SCORE_INDUSTRIES[inputs.industry]?.benchmarkMid) ?? 2.75));
                const rawSDE  = parseFloat(inputs.sde.replace(/,/g, "")) || 0;
                const isAdj   = Math.abs(usedSDE - rawSDE) > 100;
                const nts     = score.normalizationTrustScore;
                const tColor  = nts === null ? "#94A3B8" : nts < 60 ? "#F97316" : nts < 85 ? "#F59E0B" : "#10B981";
                return (
                  <div style={{
                    padding: "7px 14px", marginBottom: 10, borderRadius: 8,
                    background: isAdj ? "rgba(129,140,248,0.07)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isAdj ? "rgba(129,140,248,0.2)" : "rgba(255,255,255,0.07)"}`,
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
                  }}>
                    <div style={{ fontSize: 10, color: "#94A3B8" }}>
                      <span style={{ marginRight: 6 }}>
                        Earnings basis:{" "}
                        <span style={{ color: isAdj ? "#818CF8" : "#E2E8F0", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>
                          {isAdj ? "Usable SDE (adjusted)" : "Reported SDE"}
                        </span>
                      </span>
                      <span style={{ color: "#7C8593", marginRight: 6 }}>·</span>
                      <span>
                        SDE used:{" "}
                        <span style={{ color: "#E2E8F0", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>
                          ${usedSDE.toLocaleString()}
                        </span>
                      </span>
                      {isAdj && (
                        <>
                          <span style={{ color: "#7C8593", margin: "0 6px" }}>·</span>
                          <span>
                            Reported:{" "}
                            <span style={{ color: "#7C8593", fontFamily: "'JetBrains Mono',monospace", textDecoration: "line-through" }}>
                              ${rawSDE.toLocaleString()}
                            </span>
                          </span>
                        </>
                      )}
                      <span style={{ color: "#7C8593", margin: "0 6px" }}>·</span>
                      <span>
                        Benchmark:{" "}
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700,
                          color: score.benchmarkBasis === "direct" ? "#10B981"
                               : score.benchmarkBasis === "proxy"  ? "#F59E0B"
                               :                                      "#94A3B8",
                        }}>
                          {score.benchmarkBasis === "direct" ? "Direct RMA"
                         : score.benchmarkBasis === "proxy"  ? "Proxy RMA"
                         :                                      "Fallback"}
                        </span>
                        {score.resolvedMarginMid !== null && (
                          <span style={{ color: "#7C8593" }}>
                            {" "}({Math.round(score.resolvedMarginMid * 100)}%)
                          </span>
                        )}
                        {score.benchmarkBasis === "proxy" && (() => {
                          const ind = SCORE_INDUSTRIES[inputs.industry];
                          return ind ? (
                            <span style={{ color: "#7C8593" }}>
                              {" · "}
                              <span style={{ color: "#6B7280" }}>
                                Industry typical: {ind.marginRange[0]}–{ind.marginRange[1]}%
                              </span>
                            </span>
                          ) : null;
                        })()}
                      </span>
                    </div>
                    {nts !== null && (
                      <div style={{ fontSize: 10, color: "#94A3B8", flexShrink: 0 }}>
                        Data Confidence:{" "}
                        <span style={{ color: tColor, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>
                          {nts}/100
                        </span>
                      </div>
                    )}
                  {/* Proxy note — only shown when proxy benchmark used */}
                  {score.benchmarkBasis === "proxy" && (
                    <div style={{ marginTop: 4, fontSize: 10, color: "#F59E0B", lineHeight: 1.5 }}>
                      ⚠ Using conservative proxy benchmark — actual {SCORE_INDUSTRIES[inputs.industry]?.label ?? inputs.industry} performance may differ from RMA proxy source
                    </div>
                  )}
                  </div>
                );
              })()}

              {/* Verdict + fair value range */}
              {(() => {
                // Add normalization trust note if trust score is below full confidence
                const nts = score.normalizationTrustScore;
                const trustNote = (nts !== null && nts !== undefined && nts < 85)
                  ? `Data confidence: ${nts}/100 — ${nts < 60 ? "manual review required" : "moderate — verify inputs"}`
                  : null;
                const dForV = { gap_pct: score.gap_pct, dscr: score.dscr, overall_score: score.overall, risk_level: score.riskLevel, normalization_trust_score: nts } as DealRun;
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
                        <div style={{ fontSize: 10, color: "#7C8593", marginTop: 3 }}>
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
                          <div style={{ fontSize: 8, color: "#7C8593", textTransform: "uppercase", marginBottom: 2 }}>{s.label}</div>
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

// ─── SCORE INSIGHTS PANEL ────────────────────────────────────────────────────
// Reusable bullet list showing why a score is what it is.
// Requires scoreExplanation[] from generateScoreExplanation().

function ScoreInsightsPanel({
  explanation,
  severity,
  style,
}: {
  explanation: string[];
  severity: "positive" | "neutral" | "caution" | "warning";
  style?: React.CSSProperties;
}) {
  if (!explanation || explanation.length === 0) return null;

  const severityConfig = {
    positive: { color: "#10B981", bg: "rgba(16,185,129,0.06)",  border: "rgba(16,185,129,0.18)", label: "Positive Signals",  icon: "✓" },
    neutral:  { color: "#94A3B8", bg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.08)", label: "Score Insights",   icon: "·" },
    caution:  { color: "#F59E0B", bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.18)", label: "Score Insights",   icon: "⚠" },
    warning:  { color: "#F97316", bg: "rgba(249,115,22,0.06)",  border: "rgba(249,115,22,0.18)", label: "Score Reduced By", icon: "↓" },
  };
  const sc = severityConfig[severity];

  return (
    <div style={{
      padding: "11px 14px", borderRadius: 10,
      background: sc.bg, border: `1px solid ${sc.border}`,
      ...style,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: sc.color,
        textTransform: "uppercase" as any, letterSpacing: "0.08em", marginBottom: 8,
      }}>
        {sc.label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {explanation.map((bullet, i) => (
          <div key={i} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
            <span style={{ fontSize: 10, color: sc.color, flexShrink: 0, marginTop: 2, fontWeight: 700 }}>
              {sc.icon}
            </span>
            <span style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>{bullet}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── INDUSTRY BENCHMARK DISPLAY (inline — no external import needed) ──────────
// Renders RMA benchmark metrics from deal.rmaBenchmarks.
// ebitdaMarginPct and operatingMarginPct stored as decimals (0.121 = 12.1%).

function IndustryBenchmarkPanel({
  rmaBenchmarks,
  marginScore,
  sde,
  revenue,
  benchmarkFamily,
  style,
}: {
  rmaBenchmarks: DealRun["rmaBenchmarks"];
  marginScore: number;
  sde: number;
  revenue: number;
  benchmarkFamily?: string | null;  // used for proxy detection + UI label
  style?: React.CSSProperties;
}) {
  if (!rmaBenchmarks?.ebitdaMarginPct) {
    return (
      <div style={{
        padding: "10px 13px", borderRadius: 9,
        background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)",
        fontSize: 12, color: "#6B7280", ...style,
      }}>
        Industry benchmarks unavailable for this category.
      </div>
    );
  }

  const dealMarginPct = revenue > 0 ? (sde / revenue) : 0;
  const ratio         = rmaBenchmarks.ebitdaMarginPct > 0
    ? dealMarginPct / rmaBenchmarks.ebitdaMarginPct : 0;

  // Proxy benchmark families (med_spa etc.) use softer comparison language.
  // The RMA source is a different industry used as an approximation.
  const PROXY_FAMILIES = new Set(["med_spa"]);
  const isProxy = PROXY_FAMILIES.has(benchmarkFamily ?? "");

  const marginStatus = ratio > 1.4 ? "above" : ratio >= 0.8 ? "inline" : "below";

  // Standard labels (non-proxy industries)
  const standardCfg = {
    above:  { label: "Above Industry",        sub: "Margin is above the industry median — verify add-backs",              color: "#F97316", bg: "rgba(249,115,22,0.08)",   border: "rgba(249,115,22,0.2)"   },
    inline: { label: "In Line With Industry", sub: "Margins consistent with sector benchmarks",                           color: "#10B981", bg: "rgba(16,185,129,0.08)",   border: "rgba(16,185,129,0.2)"   },
    below:  { label: "Below Industry",        sub: "Margin underperformance or conservative add-backs",                   color: "#F59E0B", bg: "rgba(245,158,11,0.08)",   border: "rgba(245,158,11,0.2)"   },
  };

  // Proxy labels — nuanced, not accusatory
  const proxyCfg = {
    above:  { label: "Above Proxy Benchmark",    sub: "Margins exceed the closest available RMA proxy. Review add-backs and confirm whether elevated margins reflect true business economics.", color: "#F59E0B", bg: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.2)"   },
    inline: { label: "In Line With Proxy Benchmark", sub: "Margins are consistent with the closest available RMA proxy source.",                                                              color: "#10B981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)"   },
    below:  { label: "Below Proxy Benchmark",    sub: "Margins are below the proxy benchmark. May reflect conservative add-backs or higher-than-typical operating costs.",                    color: "#94A3B8", bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.1)"  },
  };

  const marginCfg = (isProxy ? proxyCfg : standardCfg)[marginStatus];

  const scoreColor = marginScore >= 70 ? "#10B981" : marginScore >= 50 ? "#F59E0B" : marginScore >= 30 ? "#F97316" : "#EF4444";

  const BRow = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div>
        <div style={{ fontSize: 12, color: "#94A3B8" }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: "#7C8593", marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0", fontFamily: "'JetBrains Mono',monospace" }}>{value}</div>
    </div>
  );

  return (
    <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)", overflow: "hidden", ...style }}>
      <div style={{ padding: "9px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" as any, letterSpacing: "0.08em" }}>
          {isProxy ? "Industry Benchmarks (Closest Available Proxy)" : "Industry Benchmarks"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 20, background: `${scoreColor}18`, border: `1px solid ${scoreColor}33` }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: scoreColor }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: scoreColor, fontFamily: "'JetBrains Mono',monospace" }}>{marginScore}</span>
          <span style={{ fontSize: 9, color: "#7C8593" }}>/ 100</span>
        </div>
      </div>
      <div style={{ padding: "2px 14px 0" }}>
        <BRow label="Typical EBITDA Margin"    value={`~${Math.round(rmaBenchmarks.ebitdaMarginPct * 100)}%`} sub="Earnings before interest, taxes, depreciation" />
        {rmaBenchmarks.operatingMarginPct && <BRow label="Typical Operating Margin" value={`~${Math.round(rmaBenchmarks.operatingMarginPct * 100)}%`} />}
        {rmaBenchmarks.currentRatio       && <BRow label="Typical Current Ratio"    value={`~${rmaBenchmarks.currentRatio.toFixed(1)}x`} sub="Short-term liquidity" />}
        {rmaBenchmarks.debtToEquity       && <BRow label="Typical Debt / Equity"    value={`~${rmaBenchmarks.debtToEquity.toFixed(1)}x`} sub="Leverage vs owner equity" />}
        {rmaBenchmarks.interestCoverage   && <BRow label="Interest Coverage"        value={`~${rmaBenchmarks.interestCoverage.toFixed(1)}x`} />}
      </div>
      <div style={{ padding: "8px 14px 10px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 11px", borderRadius: 8, background: marginCfg.bg, border: `1px solid ${marginCfg.border}` }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: marginCfg.color, flexShrink: 0, marginTop: 3 }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: marginCfg.color, textTransform: "uppercase" as any, letterSpacing: "0.06em", marginBottom: 2 }}>{marginCfg.label}</div>
            <div style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.5 }}>{marginCfg.sub}</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "6px 14px", borderTop: "1px solid rgba(255,255,255,0.04)", fontSize: 10, color: "#2D3748", fontStyle: "italic" }}>
        {isProxy
          ? "Using closest available RMA proxy benchmark — interpret with context"
          : "Based on industry financial data (RMA)"}
      </div>
    </div>
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
              <div style={{ fontSize: 11, color: "#7C8593" }}>
                {fmt(deal.asking_price)} asking · {deal.valuation_multiple.toFixed(2)}x · {ago(deal.created_at)}
                {(deal.city || deal.state) && ` · ${[deal.city, deal.state].filter(Boolean).join(", ")}`}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#7C8593", fontSize: 20, cursor: "pointer", padding: "2px 6px", lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 20px", flex: 1, overflowY: "auto" }}>

          {/* Score + metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, alignItems: "center", marginBottom: 16, padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <Ring score={deal.overall_score} size={64} />
              <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span>Overall Score</span>
                <InfoTooltip term="overallScore" size="sm" />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
              {[
                { label: "Fair Value",    value: fmt(deal.fair_value),     color: "#10B981" },
                { label: "Gap vs Mkt",   value: (gp > 0 ? "+" : "") + gp + "%", color: gp > 0 ? "#D85A30" : "#10B981" },
                { label: "DSCR",         value: deal.dscr.toFixed(2) + "x",     color: deal.dscr >= 1.25 ? "#10B981" : "#F97316" },
                { label: "Risk",         value: deal.risk_level,                 color: col(deal.overall_score) },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>{m.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono',monospace" }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Status + favorite */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 10, color: "#7C8593" }}>Status:</span>
            <select
              value={status}
              onChange={e => onStatusChange(deal.id, e.target.value as DealStatus)}
              style={{ padding: "5px 9px", borderRadius: 6, border: `1px solid ${STATUS_COLORS[status].border}`, background: STATUS_COLORS[status].bg, color: STATUS_COLORS[status].color, fontSize: 10, fontWeight: 600, outline: "none", cursor: "pointer", appearance: "none" as any }}
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <StarButton dealId={deal.id} favorites={favorites} onToggle={onToggleFav} />
            <span style={{ fontSize: 11, color: isFav ? "#F59E0B" : "#7C8593" }}>{isFav ? "Watchlisted" : "Add to watchlist"}</span>
          </div>

          {/* Score Insights */}
          {deal.scoreExplanation && deal.scoreExplanation.length > 0 && (
            <ScoreInsightsPanel
              explanation={deal.scoreExplanation}
              severity={(() => {
                const s = deal.marginScore ?? 55;
                return s >= 70 ? "positive" : s >= 50 ? "neutral" : s >= 30 ? "caution" : "warning";
              })()}
              style={{ marginBottom: 12 }}
            />
          )}

          {/* Industry Benchmarks */}
          {deal.rmaBenchmarks && (
            <IndustryBenchmarkPanel
              rmaBenchmarks={deal.rmaBenchmarks}
              marginScore={deal.marginScore ?? 55}
              sde={deal.usable_sde ?? deal.sde ?? 0}
              revenue={deal.revenue ?? 0}
              benchmarkFamily={deal.benchmark_family ?? null}
              style={{ marginBottom: 12 }}
            />
          )}

          {/* Normalization trust note */}
          {deal.normalization_trust_score !== null && deal.normalization_trust_score !== undefined && deal.normalization_trust_score < 80 && (
            <div style={{
              padding: "9px 12px", borderRadius: 9, marginBottom: 12,
              background: deal.manual_review_required ? "rgba(239,68,68,0.07)" : "rgba(245,158,11,0.07)",
              border: `1px solid ${deal.manual_review_required ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: deal.manual_review_required ? "#EF4444" : "#F59E0B",
                textTransform: "uppercase" as any, letterSpacing: "0.07em", marginBottom: 3,
                display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span>{deal.manual_review_required ? "Manual Review Required" : `Data Confidence: ${deal.normalization_trust_score}/100`}</span>
                <InfoTooltip term="trustScore" size="sm" />
              </div>
              <div style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.5 }}>
                {deal.earnings_basis === "benchmark_implied"
                  ? `Benchmark-implied SDE ($${(deal.usable_sde ?? 0).toLocaleString()}) used — stated $${(deal.reported_sde ?? deal.sde ?? 0).toLocaleString()} set aside`
                  : deal.earnings_basis === "blended"
                  ? `Conservative earnings blend applied — effective SDE $${(deal.usable_sde ?? 0).toLocaleString()}`
                  : `Data quality flags detected — review before advancing`}
              </div>
            </div>
          )}

          {/* Deal Trajectory — expanded breakdown (explanation layer) */}
          <div style={{ marginBottom: 14 }}>
            <TrajectoryBreakdown
              data={buildTrajectory({
                deal_created_at:  deal.created_at ?? null,
                first_seen_at:    (deal as any).first_seen_at ?? deal.created_at ?? null,
                asking_price:     deal.asking_price,
                usableSDE:        deal.usable_sde ?? deal.sde ?? 0,
                reportedSDE:      deal.sde ?? 0,
                dscr:             deal.dscr,
                stressDscr15:    +((deal.dscr ?? 0) * 0.85).toFixed(2),
                gap_pct:          deal.gap_pct ?? null,
                trustScore:       deal.normalization_trust_score ?? 100,
                earningsSource:   (deal.earnings_source as any) ?? "reported",
                revenue_yoy_pct:  (deal as any).revenue_yoy_pct ?? null,
                margin_yoy_pct:   (deal as any).margin_yoy_pct ?? null,
                dscr_prior:       (deal as any).dscr_prior ?? null,
                snapshots:        (deal as any).snapshots ?? null,
              })}
            />
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

// ─── COMPS TAB PROP ASSEMBLERS ───────────────────────────────────────────────
// These functions translate a DealRun row into the typed props CompsTab expects.
// No business logic — pure data reshaping from deal fields + SCORE_INDUSTRIES.

function buildBenchmarkContext(deal: DealRun): BenchmarkContext {
  const ind = SCORE_INDUSTRIES[deal.industry];
  const isProxy = deal.benchmark_is_proxy ?? false;

  // Benchmark label — use industry label rather than raw key
  const BENCHMARK_LABELS: Record<string, string> = {
    field_services:        "Local Service Benchmark",
    specialty_trade:       "Trades Benchmark",
    auto_services:         "Automotive Services Benchmark",
    food_beverage:         "Restaurant & Food Benchmark",
    healthcare_clinical:   "Healthcare Benchmark",
    behavioral_health:     "Behavioral Health Benchmark",
    med_spa:               "Med Spa Benchmark",
    medspa:                "Med Spa Benchmark",
    personal_services:     "Personal Services Benchmark",
    professional_services: "Professional Services Benchmark",
    asset_services:        "Asset-Based Business Benchmark",
    saas:                  "SaaS / Recurring Software Benchmark",
    digital:               "Digital Business Benchmark",
    manufacturing:         "Manufacturing Benchmark",
    retail:                "Retail Business Benchmark",
    wholesale:             "Wholesale / Distribution Benchmark",
  };

  const benchmarkLabel =
    BENCHMARK_LABELS[deal.benchmark_family ?? ""] ||
    (ind?.label ? `${ind.label} Benchmark` : "Industry Benchmark");

  const benchmarkSource =
    (deal.benchmark_source as "direct" | "proxy" | "fallback" | null | undefined) ?? "fallback";

  return {
    benchmarkLabel,
    benchmarkIsProxy: isProxy,
    benchmarkSource,
    // Valuation multiples from SCORE_INDUSTRIES
    lowMultiple:    ind?.benchmarkLow    ?? 2.0,
    medianMultiple: ind?.benchmarkMid    ?? 2.75,
    highMultiple:   ind?.benchmarkHigh   ?? 3.5,
    // Margin range — stored as [low%, high%] integers, convert to decimals
    marginLow:    ind ? ind.marginRange[0] / 100 : 0.10,
    marginMedian: ind ? ((ind.marginRange[0] + ind.marginRange[1]) / 2) / 100 : 0.20,
    marginHigh:   ind ? ind.marginRange[1] / 100 : 0.35,
    // DSCR range — sourced from lib/dscrRanges.ts (single source of truth)
    ...((() => { const r = getDscrRange(deal.industry); return { dscrLow: r.weak, dscrMedian: r.acceptable, dscrHigh: r.strong }; })()),
  };
}

function buildMarketPosition(deal: DealRun): MarketPosition {
  const multiple = deal.valuation_multiple ?? 0;
  const ind      = SCORE_INDUSTRIES[deal.industry];
  const low      = ind?.benchmarkLow    ?? 2.0;
  const high     = ind?.benchmarkHigh   ?? 3.5;
  const median   = ind?.benchmarkMid    ?? 2.75;

  let pricingLabel: PricingLabel;
  if      (multiple <= low * 0.75)   pricingLabel = "Well Below Market";
  else if (multiple <= low)          pricingLabel = "Below Market";
  else if (multiple <= median * 1.1) pricingLabel = "At Market";
  else if (multiple <= high)         pricingLabel = "Above Market";
  else if (multiple <= high * 1.35)  pricingLabel = "Significantly Above Market";
  else                               pricingLabel = "Extreme Outlier";

  return {
    pricingLabel,
    percentile:     deal.percentile_multiple ?? null,
    currentMultiple: multiple,
  };
}

function buildNormalizationContext(deal: DealRun): NormalizationContext {
  const reportedSDE  = deal.reported_sde ?? deal.sde ?? 0;
  const usableSDE    = deal.usable_sde   ?? deal.sde ?? 0;
  const isAdjusted   = Math.abs(reportedSDE - usableSDE) > 100;
  const revenue      = deal.revenue ?? 0;
  const ind          = SCORE_INDUSTRIES[deal.industry];

  // Reconstruct reported fair value from reported SDE using benchmark mid
  const benchmarkMid      = ind?.benchmarkMid ?? 2.75;
  const reportedFairValue = Math.round(reportedSDE * benchmarkMid);
  const adjustedFairValue = deal.fair_value ?? Math.round(usableSDE * benchmarkMid);

  return {
    reportedSDE,
    usableSDE,
    benchmarkImpliedSDE: deal.benchmark_implied_sde ?? null,
    reportedFairValue,
    adjustedFairValue,
    trustScore:    deal.normalization_trust_score ?? 100,
    earningsSource: (deal.earnings_source as NormalizationContext["earningsSource"]) ?? "reported",
    isAdjusted,
    currentMargin: revenue > 0 ? usableSDE / revenue : null,
    currentDscr:   deal.dscr ?? 0,
  };
}

function buildCompsData(deal: DealRun): CompsData {
  const ind      = SCORE_INDUSTRIES[deal.industry];
  const multiple = deal.valuation_multiple ?? 0;
  const low      = ind?.benchmarkLow  ?? 2.0;
  const high     = ind?.benchmarkHigh ?? 3.5;

  // Placeholder comps — will be replaced with real DealStats data in a future session
  const comps: CompsData["comps"] = [];

  return {
    comps,
    currentDealOutsideRange: multiple < low * 0.80 || multiple > high * 1.20,
  };
}

function buildDecisionContext(deal: DealRun): DecisionContext {
  const v       = (deal.verdict ?? dealVerdict(deal)) as VerdictLabel;
  // gp and fv used for string interpolation in summaries only — not for verdict branching
  const gp      = deal.gap_pct ?? 0;
  const fv      = deal.fair_value ?? 0;
  const usable  = deal.usable_sde ?? deal.sde ?? 0;

  const summary =
    v === "high_conviction"
      ? `Deal is materially underpriced at ${Math.abs(gp)}% below market fair value with strong debt coverage. Priority candidate — advance to LOI after confirming add-backs.`
      : v === "pursue"
      ? `Deal shows favorable pricing and financeable structure. Proceed to due diligence with standard seller information requests.`
      : v === "investigate"
      ? `Deal is in the investable zone but requires validation. Key unknowns should be resolved before committing. ${deal.manual_review_required ? "Data quality flags present — verify financials independently." : ""}`
      : v === "manual_review"
      ? `Normalization flags indicate data quality concerns that prevent a reliable verdict. Independently verify all financial inputs before drawing conclusions.`
      : `Deal does not meet investment criteria at current terms. Significant repricing or structural changes would be required to advance.`;

  const actions: string[] =
    v === "high_conviction" ? [
      "Submit LOI at or below fair value — anchor at 8% below ask",
      "Request 3 years tax returns and add-back schedule before close",
      "Confirm lease assignment and customer contract transferability",
    ]
    : v === "pursue" ? [
      "Request seller financial package: 3 years P&Ls, tax returns",
      "Validate top-5 customers and revenue concentration",
      "Run SBA 7(a) pre-qualification to confirm financing path",
    ]
    : v === "investigate" ? [
      "Obtain verified financials before advancing to LOI",
      "Clarify all add-backs with seller's accountant",
      "Run downside scenario: revenue −20%, what does DSCR look like?",
    ]
    : v === "manual_review" ? [
      "Do not advance until financials are independently verified",
      "Engage CPA to certify SDE and all add-back items",
      "Request full 3-year P&L and tax return package from broker",
    ]
    : [
      "Do not advance at current asking price",
      "Re-engage if seller reduces price to fair value range",
      `Fair value estimate: ${fv > 0 ? "$" + Math.round(fv).toLocaleString() : "unavailable at current data quality"}`,
    ];

  return { verdict: v, summary, actions };
}

// ─── UNDERWRITING PANEL ───────────────────────────────────────────────────────

type UwTab = "stress" | "lender" | "sba" | "negotiation" | "loi" | "memo" | "comps";

function UnderwritingPanel({
  deal, isPro, onClose, onShowUpgrade,
}: {
  deal: DealRun;
  isPro: boolean;
  onClose: () => void;
  onShowUpgrade?: () => void;
}) {
  const [activeTab, setActiveTab]    = useState<UwTab>("stress");
  const [compsData, setCompsData]    = useState<CompsData>({ comps: [], currentDealOutsideRange: false });
  // Benchmark IQR for this deal's industry — populated when panel opens
  const [benchmarkIqr, setBenchmarkIqr] = useState<{
    p25:         number | null;
    median:      number | null;
    p75:         number | null;
    sample_size: number;
    percentile:  number | null;   // where this deal sits in the IQR distribution
  } | null>(null);

  // Panel width mode — persisted across sessions
  const [panelExpanded, setPanelExpanded] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("nxtax_panel_expanded") === "1";
  });
  const toggleExpanded = () => {
    setPanelExpanded(prev => {
      const next = !prev;
      try { localStorage.setItem("nxtax_panel_expanded", next ? "1" : "0"); } catch {}
      return next;
    });
  };

  // Fetch real comps from dealstats_transactions when panel opens
  useEffect(() => {
    const ind      = SCORE_INDUSTRIES[deal.industry];
    const multiple = deal.valuation_multiple ?? 0;
    const low      = ind?.benchmarkLow  ?? 2.0;
    const high     = ind?.benchmarkHigh ?? 3.5;
    const outside  = multiple < low * 0.80 || multiple > high * 1.20;

    // Build NAICS from industry key for Supabase query
    const INDUSTRY_NAICS: Record<string, string> = {
      food_beverage: "722511", field_services: "561730", specialty_trade: "238900",
      auto_services: "811111", healthcare_clinical: "621111", med_spa: "621399",
      personal_services: "812112", professional_services: "541611", saas: "511210",
      digital: "454110", manufacturing: "339900", retail: "441300", wholesale: "424900",
      construction: "236220", staffing: "561320", marketing: "541810",
      engineering: "541330", veterinary: "541940", realestatebrok: "531210",
      propertymanage: "531311", seniorcare: "623312", physicaltherapy: "621340",
      remodeling: "236118", pestcontrol: "561710", signmaking: "339950",
      hairsalon: "812112", clothing: "448140", grocery: "445110",
      behavioral_health: "621420",
    };

    const naics = INDUSTRY_NAICS[deal.industry];
    if (!naics) { setCompsData({ comps: [], currentDealOutsideRange: outside }); return; }

    supabase
      .from("dealstats_transactions")
      .select("mvic_price, revenue, sde, sale_year, naics_description, naics_code")
      .eq("naics_code", naics)
      .not("mvic_price", "is", null)
      .not("sde", "is", null)
      .gt("sde", 0)
      .gt("mvic_price", 0)
      .order("sale_year", { ascending: false })
      .limit(12)
      .then(({ data }) => {
        let rows = data ?? [];
        // Fallback: 4-digit prefix if sparse
        if (rows.length < 3) {
          return supabase
            .from("dealstats_transactions")
            .select("mvic_price, revenue, sde, sale_year, naics_description, naics_code")
            .like("naics_code", `${naics.slice(0, 4)}%`)
            .not("mvic_price", "is", null)
            .not("sde", "is", null)
            .gt("sde", 0).gt("mvic_price", 0)
            .order("sale_year", { ascending: false })
            .limit(10)
            .then(({ data: broad }) => broad ?? []);
        }
        return rows;
      })
      .then((rows: any[]) => {
        const comps = (rows as any[])
          .filter(r => r.mvic_price > 0 && r.sde > 0)
          .map((r: any, i: number) => ({
            id:       `ds-${i}`,
            name:     `${(r.naics_description ?? deal.industry).split(",")[0].trim()}${r.sale_year ? ` (${r.sale_year})` : ""}`,
            revenue:  r.revenue ?? 0,
            // r.sde = DealStats seller discretionary earnings (the comp's reported earnings basis)
            // Multiple = MVIC / SDE — this is the correct closed-deal multiple for comps
            sde:      r.sde,
            multiple: +(r.mvic_price / r.sde).toFixed(2),
            note:     r.sale_year ? `Closed ${r.sale_year}` : null,
          }))
          .slice(0, 7);
        setCompsData({ comps, currentDealOutsideRange: outside });
      })
      .catch(() => setCompsData({ comps: [], currentDealOutsideRange: outside }));
  }, [deal.id, deal.industry]);

  // Fetch IQR benchmark (p25/median/p75 SDE multiple) for percentile positioning
  useEffect(() => {
    supabase
      .from("dealstats_benchmarks")
      .select("p25_mvic_to_sde,median_mvic_to_sde,p75_mvic_to_sde,sample_size")
      .eq("industry_key", deal.industry)
      .eq("size_band", "mid")
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setBenchmarkIqr(null); return; }
        const p25    = data.p25_mvic_to_sde    ?? null;
        const median = data.median_mvic_to_sde ?? null;
        const p75    = data.p75_mvic_to_sde    ?? null;
        const mult   = deal.valuation_multiple ?? 0;
        // Approx percentile — linear interpolation between known quartile points
        // (a good-enough approximation for UI; exact percentile would need full distribution)
        let percentile: number | null = null;
        if (p25 != null && median != null && p75 != null && mult > 0) {
          if      (mult <= p25)    percentile = Math.max(1, Math.round(25 * (mult / p25)));
          else if (mult <= median) percentile = Math.round(25 + 25 * ((mult - p25) / (median - p25)));
          else if (mult <= p75)    percentile = Math.round(50 + 25 * ((mult - median) / (p75 - median)));
          else                     percentile = Math.min(99, Math.round(75 + 24 * Math.min(1, (mult - p75) / (p75 * 0.5))));
        }
        setBenchmarkIqr({ p25, median, p75, sample_size: data.sample_size ?? 0, percentile });
      })
      .catch(() => setBenchmarkIqr(null));
  }, [deal.id, deal.industry, deal.valuation_multiple]);

  const ind = SCORE_INDUSTRIES[deal.industry];
  const gp  = deal.gap_pct ?? 0;
  const fv  = deal.fair_value ?? 0;
  const vd  = verdictCfg(deal.verdict ?? dealVerdict(deal));

  // ── Derived underwriting metrics ──────────────────────────────────────────
  // usableSDE: trust-gated earnings from normalization. Falls back to stated sde.
  // This is the number that was actually used to compute fair_value and dscr.
  const usableSDE = deal.usable_sde ?? deal.sde ?? 0;
  const stressDscr15 = +(deal.dscr * 0.85).toFixed(2);
  const stressDscr25 = +(deal.dscr * 0.75).toFixed(2);
  const recOffer     = fv * 0.92;
  const walkAway     = fv * 1.08;
  const sbaLoan      = deal.asking_price * 0.90;
  const sbaDown      = deal.asking_price * 0.10;
  const sbaEligible  = deal.dscr >= 1.25 && deal.asking_price <= 5_000_000;
  const sbaMonthly   = sbaLoan > 0 ? (sbaLoan * (0.1075 / 12) * Math.pow(1 + 0.1075 / 12, 120)) / (Math.pow(1 + 0.1075 / 12, 120) - 1) : 0;
  // Use usable_sde (trust-adjusted) for DSCR if available, else stated sde
  const effectiveSde = deal.usable_sde ?? deal.sde ?? 0;
  const sbaDscr      = sbaMonthly > 0 ? +(effectiveSde / (sbaMonthly * 12)).toFixed(2) : 0;

  const UW_TABS: { id: UwTab; label: string; icon: string }[] = [
    { id: "stress",      label: "Stress Test",       icon: "📉" },
    { id: "lender",      label: "Lender Readiness", icon: "🏛️" },
    { id: "sba",         label: "SBA Finance",       icon: "🏦" },
    { id: "negotiation", label: "Negotiation",   icon: "🤝" },
    { id: "loi",         label: "LOI Builder",    icon: "📝" },
    { id: "memo",        label: "Deal Memo",      icon: "📄" },
    { id: "comps",       label: "Market Comps",   icon: "📊" },
  ];

  const col = (s: number) => s >= 1.5 ? "#10B981" : s >= 1.25 ? "#F59E0B" : "#EF4444";

  // ── Per-tab freemium gating ──────────────────────────────────────────────
  // Pro users always get full access.
  // Free users start fully gated. Each tab unlocks independently after
  // clicking that tab's CTA. Unlocked tabs persist in localStorage.
  // No tab is ever auto-unlocked — first view is always blurred.

  const LS_KEY = "nxtax_unlocked_tabs";

  const [unlockedTabs, setUnlockedTabs] = React.useState<Set<UwTab>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as UwTab[];
      return new Set(stored);
    } catch { return new Set(); }
  });

  const unlockTab = (tab: UwTab) => {
    if (isPro) return; // Pro never touches localStorage
    const next = new Set(unlockedTabs);
    next.add(tab);
    setUnlockedTabs(next);
    localStorage.setItem(LS_KEY, JSON.stringify([...next]));
    // Also track total unlock count for analytics
    const n = parseInt(localStorage.getItem("nxtax_free_unlocks") ?? "0", 10);
    localStorage.setItem("nxtax_free_unlocks", String(n + 1));
  };

  // Returns true if this tab's content should be fully visible
  const tabUnlocked = (tab: UwTab): boolean => isPro || unlockedTabs.has(tab);

  // BlurGateSection prop helper — called inline per tab
  // onUnlock is always tab-specific so only that tab opens
  // BlurredContent removed — using <BlurGateSection> from components/BlurGateSection.tsx


  const MetricRow = ({ label, value, sub, color = "#E2E8F0" }: { label: string; value: string; sub?: string; color?: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div>
        <div style={{ fontSize: 12, color: "#94A3B8" }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: "#7C8593", marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "'JetBrains Mono',monospace" }}>{value}</div>
    </div>
  );

  return (
    <>
      {/* Backdrop — dimmer in expanded mode, lighter in normal */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: panelExpanded ? "rgba(0,0,0,0.78)" : "rgba(0,0,0,0.45)",
          zIndex: 200,
          backdropFilter: panelExpanded ? "blur(6px)" : "blur(2px)",
          transition: "background 260ms ease, backdrop-filter 260ms ease",
        }}
      />
      {/* Panel — responsive width w/ CSS transition (no remount on toggle) */}
      <div
        className="nxtax-uw-panel"
        style={{
          position: "fixed", top: 0, right: 0,
          width: panelExpanded
            ? "min(100vw, 1600px)"
            : "min(65vw, 1280px)",
          minWidth: "min(100vw, 460px)",
          height: "100vh",
          background: "#0D1117",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          boxShadow: panelExpanded
            ? "-24px 0 64px rgba(0,0,0,0.5)"
            : "-16px 0 40px rgba(0,0,0,0.4)",
          zIndex: 201, display: "flex", flexDirection: "column",
          animation: "slideIn 0.22s ease-out",
          transition: "width 260ms cubic-bezier(0.32, 0.72, 0, 1), box-shadow 260ms ease",
        }}
      >
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
              <div style={{ fontSize: 11, color: "#7C8593" }}>
                {fmt(deal.asking_price)} · {deal.valuation_multiple.toFixed(2)}x · Score {deal.overall_score} · DSCR {deal.dscr.toFixed(2)}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                onClick={toggleExpanded}
                title={panelExpanded ? "Collapse panel" : "Expand to full view"}
                aria-label={panelExpanded ? "Collapse panel" : "Expand panel"}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 6,
                  color: "#94A3B8",
                  fontSize: 11,
                  cursor: "pointer",
                  padding: "4px 10px",
                  display: "flex", alignItems: "center", gap: 5,
                  lineHeight: 1,
                  transition: "background 150ms ease, color 150ms ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#E2E8F0"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "#94A3B8"; }}
              >
                <span style={{ fontSize: 12 }}>{panelExpanded ? "⇤" : "⇥"}</span>
                <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
                  {panelExpanded ? "Collapse" : "Expand"}
                </span>
              </button>
              <button
                onClick={onClose}
                aria-label="Close panel"
                style={{ background: "none", border: "none", color: "#7C8593", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "2px 6px" }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 2, marginTop: 12 }}>
            {UW_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  // Always allow navigation — free preview shows on every tab
                  setActiveTab(t.id);
                }}
                style={{
                  flex: 1, padding: "6px 4px", borderRadius: 7, border: "none",
                  background: activeTab === t.id ? "rgba(99,102,241,0.15)" : "transparent",
                  color: activeTab === t.id ? "#C4B5FD" : "#7C8593",
                  fontSize: 11, fontWeight: activeTab === t.id ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content — adaptive padding by panel mode */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: panelExpanded ? "18px 32px" : "16px 20px",
          transition: "padding 260ms ease",
        }}>

          {/* Verdict banner — always visible at top */}
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "10px 14px", borderRadius: 10, marginBottom: 10,
            background: vd.bg, border: `1px solid ${vd.border}`,
          }}>
            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{vd.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: vd.color, textTransform: "uppercase" as any, letterSpacing: "0.07em", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span>Verdict: {vd.label}</span>
                  <InfoTooltip term="verdict" size="sm" />
                </div>
                <TrustBadge
                  trustScore={deal.normalization_trust_score ?? 100}
                  reportedSDE={deal.sde ?? 0}
                  usableSDE={usableSDE}
                  manualReviewRequired={deal.manual_review_required ?? false}
                  flags={(deal.normalization_flags_json ?? []).map((f: any) => ({
                    text: typeof f === "string" ? f : (f.text ?? f.message ?? String(f)),
                    severity: (f && typeof f === "object" && f.severity) || "medium",
                  }))}
                />
              </div>
              <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.5 }}>{vd.subtext}</div>
            </div>
          </div>

          {/* Trajectory chip — compact hook below verdict banner */}
          {(() => {
            const traj = buildTrajectory({
              deal_created_at:  deal.created_at ?? null,
              first_seen_at:    (deal as any).first_seen_at ?? deal.created_at ?? null,
              asking_price:     deal.asking_price,
              usableSDE:        usableSDE,
              reportedSDE:      deal.sde ?? 0,
              dscr:             deal.dscr,
              stressDscr15:     stressDscr15,
              gap_pct:          deal.gap_pct ?? null,
              trustScore:       deal.normalization_trust_score ?? 100,
              earningsSource:   (deal.earnings_source as any) ?? "reported",
              revenue_yoy_pct:  (deal as any).revenue_yoy_pct ?? null,
              margin_yoy_pct:   (deal as any).margin_yoy_pct ?? null,
              dscr_prior:       (deal as any).dscr_prior ?? null,
              snapshots:        (deal as any).snapshots ?? null,
            });
            return (
              <div style={{ marginBottom: 16 }}>
                <TrajectoryChip data={traj} />
              </div>
            );
          })()}

          {/* Score Insights — below verdict banner */}
          {deal.scoreExplanation && deal.scoreExplanation.length > 0 && (
            <ScoreInsightsPanel
              explanation={deal.scoreExplanation}
              severity={(() => {
                const s = deal.marginScore ?? 55;
                return s >= 70 ? "positive" : s >= 50 ? "neutral" : s >= 30 ? "caution" : "warning";
              })()}
              style={{ marginBottom: 14 }}
            />
          )}

          {/* Industry Benchmarks — below score insights */}
          {deal.rmaBenchmarks && (
            <IndustryBenchmarkPanel
              rmaBenchmarks={deal.rmaBenchmarks}
              marginScore={deal.marginScore ?? 55}
              sde={usableSDE}
              revenue={deal.revenue ?? 0}
              benchmarkFamily={deal.benchmark_family ?? null}
              style={{ marginBottom: 14 }}
            />
          )}

          {/* ── FREE USER INSIGHT SUMMARY — always visible, never gated ── */}
          {!isPro && (
            <div style={{
              marginBottom: 14,
              padding: "14px 16px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}>
              <div style={{
                fontSize: 9, fontWeight: 700, color: "#7C8593",
                textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10,
              }}>
                Deal Intelligence Preview
              </div>

              {/* 1. Verdict */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
                padding: "8px 10px", borderRadius: 8,
                background: vd.bg, border: `1px solid ${vd.border}` }}>
                <span style={{ fontSize: 16 }}>{vd.emoji}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: vd.color,
                    textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {vd.label}
                  </div>
                  <div style={{ fontSize: 10, color: "#6B7280", marginTop: 1 }}>{vd.subtext}</div>
                </div>
                <div style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 18, fontWeight: 800, color: vd.color }}>
                    {deal.overall_score}
                  </div>
                  <InfoTooltip term="overallScore" size="sm" />
                </div>
              </div>

              {/* 2. Key financial insight — DSCR */}
              <div style={{ display: "flex", justifyContent: "space-between",
                padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize: 11, color: "#94A3B8" }}>DSCR (Debt Coverage)</span>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  fontFamily: "'JetBrains Mono',monospace",
                  color: deal.dscr >= 1.5 ? "#10B981" : deal.dscr >= 1.25 ? "#F59E0B" : "#EF4444",
                }}>
                  {deal.dscr.toFixed(2)}x
                  {" "}
                  <span style={{ fontSize: 10, fontWeight: 400, color: "#7C8593" }}>
                    {deal.dscr >= 1.5 ? "Strong" : deal.dscr >= 1.25 ? "Borderline" : "Insufficient"}
                  </span>
                </span>
              </div>

              {/* 3. Market positioning insight */}
              <div style={{ display: "flex", justifyContent: "space-between",
                padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize: 11, color: "#94A3B8" }}>Asking Multiple</span>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  fontFamily: "'JetBrains Mono',monospace",
                  color: gp > 20 ? "#EF4444" : gp > 0 ? "#F59E0B" : "#10B981",
                }}>
                  {deal.valuation_multiple.toFixed(2)}x
                  {" "}
                  <span style={{ fontSize: 10, fontWeight: 400, color: "#7C8593" }}>
                    {gp > 20 ? "Extreme Outlier" : gp > 5 ? "Above Market" : gp < -5 ? "Below Market" : "At Market"}
                  </span>
                </span>
              </div>

              {/* 4. One implication */}
              <div style={{ marginTop: 9, fontSize: 11, color: "#6B7280", lineHeight: 1.5,
                padding: "8px 10px", borderRadius: 7,
                background: "rgba(255,255,255,0.02)" }}>
                {deal.dscr < 1.25
                  ? `⚠ DSCR of ${deal.dscr.toFixed(2)}x is below the 1.25x lender minimum — financing this deal at current terms is unlikely.`
                  : gp > 20
                  ? `⚠ Asking price is ${gp}% above estimated fair value — significant repricing required before this deal makes sense.`
                  : gp > 5
                  ? `Priced ${gp}% above market. Negotiation room exists — unlock the Negotiation tab for anchor and walk-away strategy.`
                  : `Deal is within market range. Unlock individual tabs below to see stress scenarios, SBA sizing, and comps.`}
              </div>

              {/* 5. Unlock prompt */}
              <div style={{ marginTop: 10, fontSize: 10, color: "#6B7280", textAlign: "center" as const }}>
                🔒 Detailed analysis locked per tab — click Unlock in each section to reveal
              </div>
            </div>
          )}

          {/* ── STRESS TEST ── */}
          {activeTab === "stress" && (() => {
            const passFail = deal.dscr >= 1.25 && stressDscr15 >= 1.15 ? "PASS" : "FAIL";
            const passColor = passFail === "PASS" ? "#10B981" : "#EF4444";
            const stressStatus = stressDscr15 >= 1.25 ? "Holds under modest downside"
                               : stressDscr15 >= 1.0  ? "Thins under modest downside"
                               :                        "Fails under modest downside";
            const stressColor = stressDscr15 >= 1.25 ? "#10B981"
                              : stressDscr15 >= 1.0  ? "#F59E0B"
                              :                        "#EF4444";
            const plainExplain = deal.dscr < 1.0
              ? "This deal appears overpriced and unlikely to meet standard lending thresholds."
              : deal.dscr < 1.25
              ? "Debt coverage sits below SBA minimums — financing will be constrained at current pricing."
              : deal.dscr >= 1.5
              ? "Debt coverage is strong — this deal clears standard lender thresholds comfortably."
              : "Debt coverage meets SBA minimums but leaves limited headroom for downside scenarios.";
            return (
            <>
              {/* ── FREE (always visible): verdict + headline metrics + plain explanation ── */}
              <div style={{ marginBottom: 12, padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{
                    padding: "4px 12px", borderRadius: 7,
                    background: `${passColor}18`, border: `1px solid ${passColor}55`,
                    fontSize: 12, fontWeight: 800, color: passColor,
                    fontFamily: "'Inter Tight',sans-serif", letterSpacing: "0.04em",
                  }}>
                    {passFail}
                  </div>
                  <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.5 }}>
                    Standard SBA 7(a) screening · 1.25x minimum DSCR
                  </div>
                </div>
                {/* Two headline metrics side-by-side */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 12 }}>
                  <div style={{ padding: "9px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span>DSCR</span>
                      <InfoTooltip term="dscr" size="sm" />
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: col(deal.dscr), fontFamily: "'JetBrains Mono',monospace" }}>
                      {deal.dscr.toFixed(2)}x
                    </div>
                  </div>
                  <div style={{ padding: "9px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span>Asking Multiple</span>
                      <InfoTooltip term="askingMultiple" size="sm" />
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#E2E8F0", fontFamily: "'JetBrains Mono',monospace" }}>
                      {(deal.valuation_multiple ?? 0).toFixed(2)}x
                    </div>
                  </div>
                </div>
                {/* Stress indicator chip */}
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "4px 11px", borderRadius: 20,
                  background: `${stressColor}14`, border: `1px solid ${stressColor}44`,
                  marginBottom: 10,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: stressColor }}>●</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: stressColor }}>{stressStatus}</span>
                </div>
                <div style={{ fontSize: 12, color: "#B8C1CC", lineHeight: 1.6 }}>
                  {plainExplain}
                </div>
              </div>

            <BlurGateSection
              isUnlocked={tabUnlocked("stress")}
              onUnlock={() => { unlockTab("stress"); }}
              previewHeight={220}
              headline="See how this performs under real loan terms"
              subtext="Unlock the full DSCR model, sensitivity tables, and monthly debt service breakdown."
              ctaLabel="Unlock Stress Test →"
              bullets={["Full DSCR calculations","−15% and −25% sensitivity tables","Monthly payment breakdown","Break-even SDE and revenue"]}
            >
              <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 11, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>Base Case</div>
                <MetricRow label="DSCR at Current Terms"  value={deal.dscr.toFixed(2) + "x"}     color={col(deal.dscr)} />
                <MetricRow label="Annual Debt Service"    value={fmt(usableSDE / deal.dscr)} sub="Usable SDE ÷ DSCR" />
                <MetricRow label="Monthly Payment"        value={fmt(deal.monthly_payment ?? usableSDE / deal.dscr / 12)} />
              </div>
              <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}>
                <div style={{ fontSize: 11, color: "#F97316", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>Downside Scenarios</div>
                <MetricRow label="−15% Revenue Stress"   value={stressDscr15 + "x DSCR"}  color={col(stressDscr15)} sub={`Usable SDE drops to ~${fmt(usableSDE * 0.85)}`} />
                <MetricRow label="−25% Revenue Stress"   value={stressDscr25 + "x DSCR"}  color={col(stressDscr25)} sub={`Usable SDE drops to ~${fmt(usableSDE * 0.75)}`} />
                <MetricRow label="Break-Even SDE"        value={fmt(usableSDE / deal.dscr)}  sub="Minimum usable SDE to cover debt service" color="#F59E0B" />
                <MetricRow label="Revenue Break-Even"    value={fmt(usableSDE / deal.dscr / (usableSDE / Math.max(deal.revenue ?? 1, 1)))}  sub="Estimated revenue needed at break-even" color="#F59E0B" />
              </div>
              <div style={{ padding: "10px 12px", borderRadius: 8, background: stressDscr15 >= 1.25 ? "rgba(16,185,129,0.06)" : "rgba(245,158,11,0.06)", border: `1px solid ${stressDscr15 >= 1.25 ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)"}`, fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>
                {stressDscr15 >= 1.25
                  ? `This deal maintains lender-minimum DSCR even at −15% revenue. Stress resilience is solid.`
                  : `A −15% revenue decline pushes DSCR below 1.25x — deal loses financing viability under moderate stress. Validate revenue stability before proceeding.`}
              </div>
            </BlurGateSection>
            </>
            );
          })()}

          {/* ── LENDER READINESS ── */}
          {activeTab === "lender" && (() => {
            const lrData = buildLenderReadiness({
              asking_price:    deal.asking_price,
              usableSDE:       usableSDE,
              dscr:            deal.dscr,
              stressDscr15:    stressDscr15,
              stressDscr25:    stressDscr25,
              industry:        deal.industry,
              trustScore:      deal.normalization_trust_score ?? 100,
              earningsSource:  (deal.earnings_source as any) ?? "reported",
              fair_value:      deal.fair_value ?? 0,
              gap_pct:         deal.gap_pct ?? null,
              valuation_multiple: deal.valuation_multiple ?? 0,
              owner_operated:         deal.owner_operated ?? null,
              customer_concentration: deal.customer_concentration ?? null,
              has_real_estate:        deal.has_real_estate ?? null,
              buyer_owns_other_biz:   null,
            });
            const verdictColor = lrData.verdict === "likely_financeable" ? "#10B981"
                               : lrData.verdict === "borderline"          ? "#F59E0B"
                               : lrData.verdict === "manual_review"       ? "#818CF8"
                               :                                             "#EF4444";
            const fitColor = lrData.industryFit.state === "preferred"       ? "#10B981"
                           : lrData.industryFit.state === "standard"        ? "#2DD4BF"
                           : lrData.industryFit.state === "higher_scrutiny" ? "#F59E0B"
                           : lrData.industryFit.state === "sba_ineligible"  ? "#EF4444"
                           :                                                  "#64748B";
            // Pick 2-3 top reasons (critical/warning severity bullets from whyBullets)
            const topReasons = lrData.whyBullets
              .filter(b => b.severity === "critical" || b.severity === "warning")
              .slice(0, 3)
              .map(b => b.text);
            // Simple improvement hint — first critical/high improvement action
            const topImprovement = lrData.improvements.find(i => i.priority === "critical")?.text
                                ?? lrData.improvements.find(i => i.priority === "high")?.text
                                ?? "Obtain verified tax returns and lender-ready documentation.";
            // Simple status sentence
            const simpleStatus = lrData.verdict === "not_financeable"
              ? "Not financeable under typical SBA guidelines at current pricing."
              : lrData.verdict === "borderline"
              ? "Borderline — financeable only with structural improvements or stronger documentation."
              : lrData.verdict === "manual_review"
              ? "Needs manual review — earnings quality must be verified before any lender will engage."
              : "Likely financeable under standard SBA guidelines once documentation is assembled.";
            return (
            <>
              {/* ── FREE (always visible): status + 2-3 reasons + improvement hint ── */}
              <div style={{ marginBottom: 12, padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  <div style={{ padding: "5px 12px", borderRadius: 7, background: `${verdictColor}18`, border: `1px solid ${verdictColor}55` }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: verdictColor, fontFamily: "'Inter Tight',sans-serif" }}>{lrData.verdictLabel}</div>
                  </div>
                  <div style={{ padding: "5px 12px", borderRadius: 7, background: `${fitColor}14`, border: `1px solid ${fitColor}44` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: fitColor, fontFamily: "'Inter Tight',sans-serif" }}>{lrData.industryFit.label}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#B8C1CC", lineHeight: 1.6, marginBottom: 12 }}>
                  {simpleStatus}
                </div>
                {topReasons.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 7, display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <span>Why</span>
                      <InfoTooltip term="lenderVerdict" size="sm" />
                    </div>
                    {isPro ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                        {topReasons.map((r, i) => (
                          <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 11, color: "#94A3B8", lineHeight: 1.55 }}>
                            <span style={{ color: "#F59E0B", flexShrink: 0, marginTop: 1, fontWeight: 700 }}>·</span>
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        onClick={() => { window.location.href = "/pricing"; }}
                        style={{
                          padding: "9px 12px", borderRadius: 7, marginBottom: 12,
                          background: "rgba(245,158,11,0.04)", border: "1px dashed rgba(245,158,11,0.25)",
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, color: "#F59E0B" }}>🔒</span>
                          <span style={{ fontSize: 11, color: "#C4C8D1", fontWeight: 500 }}>
                            {topReasons.length} {topReasons.length === 1 ? "factor" : "factors"} flagged — unlock to see which
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: "#F59E0B", fontWeight: 600 }}>Pro →</span>
                      </div>
                    )}
                  </>
                )}
                <div style={{ padding: "9px 12px", borderRadius: 7, background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
                  <div style={{ fontSize: 9, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 4 }}>Improvement Hint</div>
                  <div style={{ fontSize: 11, color: "#B8C1CC", lineHeight: 1.55 }}>{topImprovement}</div>
                </div>
              </div>

              <BlurGateSection
                isUnlocked={tabUnlocked("lender")}
                onUnlock={() => { unlockTab("lender"); }}
                previewHeight={240}
                headline="See exact loan structure and approval odds"
                subtext="Unlock full SBA structure, required equity injection, lender perspective, and approval likelihood."
                ctaLabel="Unlock Lender Readiness"
                footerNote="1 free unlock available · Upgrade to Pro for full lender prequal view"
                bullets={[
                  "Core metrics and DSCR under multiple scenarios",
                  "Required equity injection and interest assumptions",
                  "Complete seller / buyer / acquisition checklist",
                  "All improvement actions and risk flags",
                ]}
              >
                <LenderReadinessTab data={lrData} />
              </BlurGateSection>
            </>
            );
          })()}

          {/* ── SBA FINANCE ── */}
          {activeTab === "sba" && (() => {
            // Compute a RANGE for the monthly payment (±8% to reflect rate variability)
            const paymentLow  = Math.round(sbaMonthly * 0.92);
            const paymentHigh = Math.round(sbaMonthly * 1.08);
            const sbaStatement = deal.dscr < 1.0
              ? "This deal likely cannot support SBA debt at current price."
              : deal.dscr < 1.25
              ? "This deal is unlikely to qualify for SBA financing without material repricing."
              : deal.asking_price > 5_000_000
              ? "This deal exceeds the $5M SBA 7(a) cap — alternative financing required."
              : "This deal appears to support SBA debt at current price and terms.";
            const statementColor = deal.dscr < 1.25 || deal.asking_price > 5_000_000 ? "#F59E0B" : "#10B981";
            return (
            <>
              {/* ── FREE (always visible): payment range + simple qualification statement ── */}
              <div style={{ marginBottom: 12, padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 10 }}>Financing Outlook</div>

                {/* Payment range pill */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span>Estimated Monthly Payment</span>
                    <InfoTooltip term="debtService" size="sm" />
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#60A5FA", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-0.01em" }}>
                    {fmt(paymentLow)} – {fmt(paymentHigh)}
                  </div>
                  <div style={{ fontSize: 10, color: "#7C8593", marginTop: 3 }}>
                    Range reflects typical SBA 7(a) rate variability
                  </div>
                </div>

                <div style={{
                  padding: "10px 12px", borderRadius: 8,
                  background: `${statementColor}10`,
                  border: `1px solid ${statementColor}33`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: statementColor, lineHeight: 1.6 }}>
                    {sbaStatement}
                  </div>
                </div>
              </div>

            <BlurGateSection
              isUnlocked={tabUnlocked("sba")}
              onUnlock={() => { unlockTab("sba"); }}
              previewHeight={180}
              headline="Unlock full SBA financing model"
              subtext="Get the complete loan structure — amortization, rate assumptions, DSCR scenarios, and equity recovery analysis."
              ctaLabel="Unlock SBA Financing →"
              bullets={["Full loan sizing and down payment breakdown","Monthly and annual debt service","Amortization and interest assumptions","Equity recovery + Year-1 cash-on-cash return"]}
            >
              {/* Gated content — full SBA breakdown (loan basics moved inside) */}
              <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, background: sbaEligible ? "rgba(16,185,129,0.06)" : "rgba(245,158,11,0.06)", border: `1px solid ${sbaEligible ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{sbaEligible ? "✅" : "⚠️"}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: sbaEligible ? "#10B981" : "#F59E0B" }}>
                    SBA 7(a) {sbaEligible ? "Appears Eligible" : "May Require Review"}
                  </div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                    {sbaEligible ? `DSCR ${deal.dscr.toFixed(2)}x exceeds 1.25x minimum, ask under $5M` : deal.dscr < 1.25 ? `DSCR ${deal.dscr.toFixed(2)}x — cannot support debt at these terms (below 1.25x minimum)` : `Deal size exceeds typical SBA 7(a) range`}
                  </div>
                </div>
              </div>

              <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 10 }}>Loan Sizing</div>
                <MetricRow label="Loan Amount (90% LTV)" value={fmt(sbaLoan)}    color="#60A5FA" />
                <MetricRow label="Down Payment (10%)"    value={fmt(sbaDown)}    color="#F59E0B" />
                <MetricRow label="DSCR at SBA Terms"     value={sbaDscr.toFixed(2) + "x"} color={col(sbaDscr)} />
              </div>

              <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>Debt Service Detail</div>
                <MetricRow label="Est. Monthly Payment"  value={fmt(sbaMonthly)} sub="10yr @ 10.75% (SBA prime+2.75)" />
                <MetricRow label="Annual Debt Service"   value={fmt(sbaMonthly * 12)} />
              </div>


              <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>Debt Service Detail</div>
                <MetricRow label="Est. Monthly Payment"  value={fmt(sbaMonthly)} sub="10yr @ 10.75% (SBA prime+2.75)" />
                <MetricRow label="Annual Debt Service"   value={fmt(sbaMonthly * 12)} />
              </div>

              {/* ── EQUITY RECOVERY ── */}
              {(() => {
                const annualDebtService = sbaMonthly * 12;
                const annualCashFlow    = usableSDE - annualDebtService;
                const yearsToRecover    = annualCashFlow > 0 ? sbaDown / annualCashFlow : null;
                const cocReturn         = sbaDown > 0 && annualCashFlow > 0 ? (annualCashFlow / sbaDown) * 100 : null;
                const loanTermYears     = 10;  // matches SBA estimator default

                // Color logic — green highlights strong outcomes
                const recoveryColor =
                  yearsToRecover == null     ? "#EF4444"
                  : yearsToRecover <= 2       ? "#10B981"
                  : yearsToRecover <= 4       ? "#F59E0B"
                  :                             "#F97316";

                const cocColor =
                  cocReturn == null           ? "#EF4444"
                  : cocReturn >= 40            ? "#10B981"
                  : cocReturn >= 20            ? "#F59E0B"
                  :                             "#F97316";

                return (
                  <div style={{
                    padding: "14px 16px", borderRadius: 10, marginBottom: 16,
                    background: "rgba(16,185,129,0.03)",
                    border: "1px solid rgba(16,185,129,0.18)",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ fontSize: 11, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                        💰 Equity Recovery
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: "#7C8593", lineHeight: 1.5, marginBottom: 12 }}>
                      Measures how quickly you recover your invested capital based on current earnings and debt structure.
                    </div>

                    {/* 3-column grid on wide, stacks on narrow */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: 10,
                    }}>
                      {/* Time to Recover Down Payment */}
                      <div style={{
                        padding: "10px 12px", borderRadius: 8,
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}>
                        <div style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>
                          Recover Down Payment
                        </div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: recoveryColor, fontFamily: "'JetBrains Mono',monospace", marginBottom: 3 }}>
                          {yearsToRecover != null ? `${yearsToRecover.toFixed(1)} yrs` : "N/A"}
                        </div>
                        <div style={{ fontSize: 10, color: "#7C8593", lineHeight: 1.4 }}>
                          {yearsToRecover == null
                            ? "Negative cash flow — recovery not possible at current terms"
                            : yearsToRecover <= 2
                            ? "Fast recovery — strong cash return profile"
                            : yearsToRecover <= 4
                            ? "Typical SBA recovery window"
                            : "Slow recovery — evaluate pricing or structure"}
                        </div>
                      </div>

                      {/* Time to Full Ownership */}
                      <div style={{
                        padding: "10px 12px", borderRadius: 8,
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}>
                        <div style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>
                          Full Ownership
                        </div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: "#60A5FA", fontFamily: "'JetBrains Mono',monospace", marginBottom: 3 }}>
                          {loanTermYears} yrs
                        </div>
                        <div style={{ fontSize: 10, color: "#7C8593", lineHeight: 1.4 }}>
                          Loan fully amortized — business is debt-free
                        </div>
                      </div>

                      {/* Cash-on-Cash Return Year 1 */}
                      <div style={{
                        padding: "10px 12px", borderRadius: 8,
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}>
                        <div style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>
                          Cash-on-Cash (Y1)
                        </div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: cocColor, fontFamily: "'JetBrains Mono',monospace", marginBottom: 3 }}>
                          {cocReturn != null ? `${cocReturn.toFixed(0)}%` : "N/A"}
                        </div>
                        <div style={{ fontSize: 10, color: "#7C8593", lineHeight: 1.4 }}>
                          {cocReturn == null
                            ? "No return — debt service exceeds earnings"
                            : cocReturn >= 40
                            ? "Strong first-year return on equity"
                            : cocReturn >= 20
                            ? "Solid return above market benchmarks"
                            : "Modest return — stretched structure"}
                        </div>
                      </div>
                    </div>

                    {/* Summary line */}
                    <div style={{
                      marginTop: 12, paddingTop: 10,
                      borderTop: "1px solid rgba(255,255,255,0.04)",
                      fontSize: 11, color: "#94A3B8", lineHeight: 1.6,
                    }}>
                      {annualCashFlow <= 0
                        ? `Annual cash flow after debt service is ${fmt(annualCashFlow)} — deal does not generate positive equity return at current pricing.`
                        : `After servicing debt, this deal generates ${fmt(annualCashFlow)}/year in free cash flow. At current earnings, you recover your ${fmt(sbaDown)} down payment in roughly ${yearsToRecover!.toFixed(1)} years.`}
                    </div>

                    {/* Reality anchor — prevents overconfidence on fast-recovery deals */}
                    {annualCashFlow > 0 && (
                      <div style={{
                        marginTop: 10, padding: "9px 12px", borderRadius: 8,
                        background: "rgba(100,116,139,0.06)",
                        border: "1px solid rgba(100,116,139,0.15)",
                      }}>
                        <div style={{
                          fontSize: 10, fontWeight: 700, color: "#64748B",
                          textTransform: "uppercase" as const, letterSpacing: "0.06em",
                          marginBottom: 6, fontFamily: "'Inter Tight',sans-serif",
                        }}>
                          Reality Check
                        </div>
                        <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.6, marginBottom: 8 }}>
                          Assumes current earnings are sustainable. Figures exclude taxes, reinvestment needs, and growth or contraction in the business.
                        </div>
                        {/* Sensitivity at −15% earnings */}
                        {(() => {
                          const stressedSde       = usableSDE * 0.85;
                          const stressedCash      = stressedSde - annualDebtService;
                          const stressedRecovery  = stressedCash > 0 ? sbaDown / stressedCash : null;
                          return (
                            <div style={{
                              display: "flex", alignItems: "center", gap: 8,
                              fontSize: 11, color: "#94A3B8",
                              paddingTop: 7, borderTop: "1px solid rgba(255,255,255,0.04)",
                            }}>
                              <span style={{
                                fontSize: 9, fontWeight: 700, color: "#F59E0B",
                                padding: "2px 7px", borderRadius: 20,
                                background: "rgba(245,158,11,0.08)",
                                border: "1px solid rgba(245,158,11,0.25)",
                                textTransform: "uppercase" as const, letterSpacing: "0.06em",
                                whiteSpace: "nowrap" as const,
                              }}>
                                Stress −15%
                              </span>
                              <span>
                                {stressedRecovery == null
                                  ? `Earnings drop of 15% wipes out free cash flow — recovery stalls.`
                                  : `At 15% lower earnings, recovery extends to ${stressedRecovery.toFixed(1)} years (cash-on-cash ${((stressedCash / sbaDown) * 100).toFixed(0)}%).`}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.12)", fontSize: 11, color: "#94A3B8", lineHeight: 1.6 }}>
                SBA 7(a) rates typically prime + 2.25–2.75%. Current estimates use 10.75%. Equity injection, goodwill caps, and lender overlays may affect final terms. Consult an SBA-preferred lender for formal qualification.
              </div>
            </BlurGateSection>
            </>
            );
          })()}

          {/* ── NEGOTIATION ── */}
          {activeTab === "negotiation" && (() => {
            // High-level insight and suggested direction — no specific numbers
            const insight = gp > 20
              ? "This deal is significantly overpriced relative to market benchmarks."
              : gp > 10
              ? "This deal is priced above fair value and will require negotiation."
              : gp < -10
              ? "This deal is priced below fair value — investigate why before moving up."
              : "This deal is priced near fair value — focus on terms and structure.";
            const direction = gp > 20
              ? "Substantial price reduction required to reach market-consistent levels."
              : gp > 10
              ? "Moderate price reduction likely needed — structure can bridge part of the gap."
              : gp < -10
              ? "Minimal price movement needed — focus diligence on earnings quality."
              : "Price negotiation is secondary — focus on seller note, earnout, and working capital.";
            const insightColor = gp > 20 ? "#EF4444" : gp > 10 ? "#F59E0B" : gp < -10 ? "#10B981" : "#60A5FA";
            return (
            <>
              {/* ── FREE (always visible): high-level insight + suggested direction ── */}
              <div style={{ marginBottom: 12, padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 10 }}>Pricing Position</div>
                <div style={{
                  padding: "10px 12px", borderRadius: 8,
                  background: `${insightColor}10`, border: `1px solid ${insightColor}33`,
                  marginBottom: 10,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: insightColor, lineHeight: 1.5, marginBottom: 5 }}>
                    {insight}
                  </div>
                </div>
                <div style={{ padding: "9px 12px", borderRadius: 7, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 4 }}>Suggested Direction</div>
                  <div style={{ fontSize: 12, color: "#B8C1CC", lineHeight: 1.6 }}>{direction}</div>
                </div>
              </div>

            <BlurGateSection
              isUnlocked={tabUnlocked("negotiation")}
              onUnlock={() => { unlockTab("negotiation"); }}
              previewHeight={160}
              headline="Get your exact offer and negotiation strategy"
              subtext="Unlock anchor offer, walk-away price, and deal structure tactics."
              ctaLabel="Unlock Negotiation Strategy →"
              bullets={["Exact anchor offer and walk-away price","Seller note and earnout structures","Working capital and training terms","Concession strategy playbook"]}
            >
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>Pricing Position</div>
                <MetricRow label="Asking Price"         value={fmt(deal.asking_price)}  />
                <MetricRow label="NexTax Fair Value"    value={fmt(fv)}         color="#10B981" />
                <MetricRow label="Gap vs Market"        value={(gp > 0 ? "+" : "") + gp + "%"} color={gp > 0 ? "#D85A30" : "#10B981"} />
                <MetricRow label="Anchor Offer"         value={fmt(recOffer)}   color="#818CF8" sub="~8% below fair value — opens negotiation" />
                <MetricRow label="Walk-Away Price"      value={fmt(walkAway)}   color="#F97316" sub="~8% above fair value — max justified" />
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>Structure Ideas</div>
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
            </BlurGateSection>
            </>
            );
          })()}

          {/* ── LOI BUILDER ── */}
          {activeTab === "loi" && (() => {
            const loiData = buildLoiRecommendation({
              asking_price:    deal.asking_price,
              fair_value:      deal.fair_value ?? 0,
              usableSDE:       usableSDE,
              gap_pct:         deal.gap_pct ?? null,
              dscr:            deal.dscr,
              stressDscr15:    stressDscr15,
              stressDscr25:    stressDscr25,
              trustScore:      deal.normalization_trust_score ?? 100,
              earningsSource:  (deal.earnings_source as any) ?? "reported",
              industryFit:     (INDUSTRY_FIT[deal.industry] ?? "requires_review") as any,
              sbaEligible:     sbaEligible,
              owner_operated:         deal.owner_operated ?? null,
              customer_concentration: deal.customer_concentration ?? null,
              years_in_business:      deal.years_in_business ?? null,
            });
            const stanceColor = loiData.stance === "aggressive"   ? "#10B981"
                              : loiData.stance === "balanced"     ? "#60A5FA"
                              : loiData.stance === "conservative" ? "#F59E0B"
                              :                                     "#EF4444";
            // Indicative range (not exact) — widen ±5% around target to feel directional
            const rangeLow  = Math.round(loiData.targetRangeLow  * 0.97);
            const rangeHigh = Math.round(loiData.targetRangeHigh * 1.03);
            // Round indicative numbers heavily so free users see "around $X" not precise targets
            const toNice = (n: number) => {
              if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
              if (n >= 100_000)   return `$${Math.round(n / 10_000) * 10}K`;
              return `$${Math.round(n / 1_000)}K`;
            };
            return (
            <>
              {/* ── FREE (always visible): LOI preview skeleton ── */}
              <div style={{ marginBottom: 12, padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>LOI Preview</div>
                  <div style={{ fontSize: 9, color: "#F59E0B", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", padding: "2px 8px", borderRadius: 20, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
                    Preview Only
                  </div>
                </div>

                {/* Placeholder skeleton — structured LOI shell */}
                <div style={{ fontSize: 11, color: "#B8C1CC", lineHeight: 1.8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 14px" }}>
                    <div style={{ color: "#9CA3AF", fontWeight: 600 }}>Buyer:</div>
                    <div style={{ color: "#7C8593", fontStyle: "italic" }}>[Your entity name]</div>

                    <div style={{ color: "#9CA3AF", fontWeight: 600 }}>Seller:</div>
                    <div style={{ color: "#7C8593", fontStyle: "italic" }}>[Seller entity name]</div>

                    <div style={{ color: "#9CA3AF", fontWeight: 600 }}>Deal Type:</div>
                    <div style={{ color: "#E2E8F0" }}>Asset purchase preferred</div>

                    <div style={{ color: "#9CA3AF", fontWeight: 600 }}>Indicative Price:</div>
                    <div style={{ color: "#818CF8", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>
                      {toNice(rangeLow)}–{toNice(rangeHigh)}
                    </div>

                    <div style={{ color: "#9CA3AF", fontWeight: 600 }}>Posture:</div>
                    <div>
                      <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 20, background: `${stanceColor}18`, border: `1px solid ${stanceColor}55`, fontSize: 10, fontWeight: 700, color: stanceColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {loiData.stance === "aggressive"   ? "Lean In"
                         : loiData.stance === "balanced"    ? "Disciplined"
                         : loiData.stance === "conservative"? "Protective"
                         :                                    "Heavy Structure"}
                      </span>
                    </div>

                    <div style={{ color: "#9CA3AF", fontWeight: 600 }}>Basic Terms:</div>
                    <div style={{ color: "#7C8593" }}>Cash at close, seller note, earnout, diligence period</div>
                  </div>
                </div>

                <div style={{ marginTop: 14, padding: "9px 12px", borderRadius: 7, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}>
                  <div style={{ fontSize: 11, color: "#F59E0B", fontWeight: 600, lineHeight: 1.5 }}>
                    This is a preview — critical deal protections and final terms are not included.
                  </div>
                </div>
              </div>

              <BlurGateSection
                isUnlocked={tabUnlocked("loi")}
                onUnlock={() => { unlockTab("loi"); }}
                previewHeight={220}
                headline="Turn this into a lender-ready LOI with negotiation protection"
                subtext="Unlock exact offer price, financing structure, working capital clauses, and all buyer protections."
                ctaLabel="Unlock LOI Builder"
                footerNote="1 free unlock available · Upgrade to Pro for full deal structuring"
                bullets={[
                  "Exact anchor, target range, and max justified price",
                  "Full structure — cash, seller note, earnout, working capital",
                  "Buyer protections and financing contingency",
                  "Pre-LOI checklist and term confirmation",
                ]}
              >
                <LoiBuilderTab data={loiData} />
              </BlurGateSection>
            </>
            );
          })()}

          {activeTab === "memo" && (() => {
                // Pre-compute once for both teaser and gated content
                const loc    = [deal.city, deal.state].filter(Boolean).join(", ") || "undisclosed market";
                const indLbl = IL[deal.industry] || deal.industry;
                const gapStr = gp > 0 ? `${gp}% above` : `${Math.abs(gp)}% below`;
                const summaryText = `${indLbl} located in ${loc}. Asking ${fmt(deal.asking_price)} at ${deal.valuation_multiple.toFixed(2)}x SDE — ${gapStr} the NexTax fair value of ${fmt(fv)}. Overall score ${deal.overall_score}/100 — ${deal.risk_level} Risk.`;

                const memoInputTeaser = {
                  asking_price:     deal.asking_price,
                  usableSDE:        usableSDE,
                  reportedSDE:      deal.sde ?? 0,
                  dscr:             deal.dscr,
                  stressDscr15:     stressDscr15,
                  stressDscr25:     stressDscr25,
                  industry:         deal.industry,
                  industryFit:      (INDUSTRY_FIT[deal.industry] ?? "requires_review") as any,
                  trustScore:       deal.normalization_trust_score ?? 100,
                  earningsSource:   (deal.earnings_source as any) ?? "reported",
                  gap_pct:          deal.gap_pct ?? null,
                  valuation_multiple: deal.valuation_multiple,
                  owner_operated:         deal.owner_operated ?? null,
                  customer_concentration: deal.customer_concentration ?? null,
                  has_real_estate:        deal.has_real_estate ?? null,
                  years_in_business:      deal.years_in_business ?? null,
                  manual_review_required: deal.manual_review_required ?? false,
                };
                const riskFlagsTeaser = buildRiskFlags(memoInputTeaser);

                // ── Evidence-driven flags — derived from the deal's evidence_profile ──
                // These take precedence over legacy risk flags when available because they
                // carry explicit HARD (data-backed) vs SOFT (inferred) evidentiary basis.
                // Deals saved before the evidence-profile rollout have ep = null; we fall
                // back gracefully to legacy flags in that case.
                const ep = deal.evidence_profile;
                const evidenceRisks: { level: "high" | "medium" | "low"; message: string }[] = [];
                if (ep) {
                  // Add-back band → severity mapping
                  if (ep.addBackBand === "aggressive") {
                    evidenceRisks.push({ level: "high",   message: ep.addBackMessage });
                  } else if (ep.addBackBand === "elevated") {
                    evidenceRisks.push({ level: "medium", message: ep.addBackMessage });
                  } else if (ep.addBackBand === "moderate") {
                    evidenceRisks.push({ level: "low",    message: ep.addBackMessage });
                  }
                  // Concentration basis + band → severity mapping
                  if (ep.concentrationBasis === "hard") {
                    if      (ep.concentrationBand === "high")     evidenceRisks.push({ level: "high",   message: ep.concentrationMessage });
                    else if (ep.concentrationBand === "moderate") evidenceRisks.push({ level: "medium", message: ep.concentrationMessage });
                  } else if (ep.concentrationBasis === "soft") {
                    // Inferred concentration — soft flag, medium severity with explicit "requires validation" framing
                    evidenceRisks.push({ level: "medium", message: ep.concentrationMessage });
                  }
                  // Note: concentrationBasis === "none" produces no flag — we don't fabricate risk
                }

                // Dedupe legacy risk flags that would overlap with evidence-driven ones.
                // If the evidence profile covers add-backs or concentration, drop the
                // legacy heuristic versions so the memo reads cleanly.
                const hasEvidenceAddBack       = evidenceRisks.some(r => r.message.toLowerCase().includes("add-back"));
                const hasEvidenceConcentration = evidenceRisks.some(r => r.message.toLowerCase().includes("customer") || r.message.toLowerCase().includes("concentration"));
                const legacyFiltered = riskFlagsTeaser.filter((f: any) => {
                  const m = String(f.message || "").toLowerCase();
                  if (hasEvidenceAddBack       && m.includes("add-back"))       return false;
                  if (hasEvidenceConcentration && (m.includes("customer") || m.includes("concentration"))) return false;
                  return true;
                });

                const highCount   = [...evidenceRisks, ...legacyFiltered].filter(f => f.level === "high").length;
                const medCount    = [...evidenceRisks, ...legacyFiltered].filter(f => f.level === "medium").length;
                const lowCount    = [...evidenceRisks, ...legacyFiltered].filter(f => f.level === "low").length;

                // Top 3 risks — evidence-driven flags first within each severity tier,
                // then legacy-derived flags. Stratified high → medium → low.
                const allRisks = [
                  ...evidenceRisks.filter(f => f.level === "high"),
                  ...legacyFiltered.filter(f => f.level === "high"),
                  ...evidenceRisks.filter(f => f.level === "medium"),
                  ...legacyFiltered.filter(f => f.level === "medium"),
                  ...evidenceRisks.filter(f => f.level === "low"),
                  ...legacyFiltered.filter(f => f.level === "low"),
                ];
                const top3Risks = allRisks.slice(0, 3);

                // "What must be true" — top 3 conditions for the deal to work
                const mustBeTrueTop = [
                  `SDE of ${fmt(usableSDE)} is the earnings basis used for scoring${usableSDE !== (deal.sde ?? 0) ? " (trust-adjusted)" : ""}.`,
                  `DSCR of ${deal.dscr.toFixed(2)}x holds under normalized owner compensation.`,
                  `Revenue trend is stable or growing — no single-customer concentration above 20%.`,
                ];

                // High-level recommendation — Proceed / Caution / Pass
                const verdictKey = deal.verdict ?? dealVerdict(deal);
                const highLevelRec: { label: string; color: string; icon: string } =
                  verdictKey === "high_conviction" ? { label: "Proceed",   color: "#10B981", icon: "→" }
                  : verdictKey === "pursue"        ? { label: "Proceed",   color: "#10B981", icon: "→" }
                  : verdictKey === "investigate"   ? { label: "Caution",   color: "#F59E0B", icon: "⚠" }
                  : verdictKey === "manual_review" ? { label: "Caution",   color: "#F59E0B", icon: "⚠" }
                  :                                  { label: "Pass",      color: "#EF4444", icon: "✗" };

                return (
                <>
                  {/* ── FREE (always visible): summary + top 3 risks + must-be-true + high-level rec ── */}
                  <div style={{ marginBottom: 12, padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {/* Summary */}
                    <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>Deal Summary</div>
                    <div style={{ fontSize: 12, color: "#B8C1CC", lineHeight: 1.6, marginBottom: 14 }}>
                      {summaryText}
                    </div>

                    {/* Top 3 risks */}
                    {top3Risks.length > 0 && (
                      <>
                        <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 7, display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <span>Top 3 Risks</span>
                          <InfoTooltip term="riskLevel" size="sm" />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                          {top3Risks.map((r, i) => {
                            const rc = r.level === "high" ? "#EF4444" : r.level === "medium" ? "#F59E0B" : "#94A3B8";
                            return (
                              <div key={i} style={{
                                padding: "8px 11px", borderRadius: 7,
                                background: `${rc}10`, border: `1px solid ${rc}33`,
                                display: "flex", gap: 9, alignItems: "flex-start",
                              }}>
                                <span style={{ color: rc, flexShrink: 0, marginTop: 1, fontSize: 10, fontWeight: 800 }}>●</span>
                                <span style={{ fontSize: 11, color: "#B8C1CC", lineHeight: 1.5 }}>{r.text}</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* What must be true */}
                    <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 7 }}>What Must Be True</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
                      {mustBeTrueTop.map((m, i) => (
                        <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 11, color: "#94A3B8", lineHeight: 1.55 }}>
                          <span style={{ color: "#818CF8", flexShrink: 0, marginTop: 1, fontWeight: 700 }}>→</span>
                          <span>{m}</span>
                        </div>
                      ))}
                    </div>

                    {/* High-level recommendation — visible to Pro, gated for free */}
                    {isPro ? (
                      <div style={{
                        padding: "10px 14px", borderRadius: 8,
                        background: `${highLevelRec.color}12`,
                        border: `1px solid ${highLevelRec.color}44`,
                        display: "flex", alignItems: "center", gap: 10,
                      }}>
                        <span style={{ fontSize: 14, color: highLevelRec.color, fontWeight: 800 }}>{highLevelRec.icon}</span>
                        <div>
                          <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 2 }}>Recommendation</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: highLevelRec.color, fontFamily: "'Inter Tight',sans-serif" }}>
                            {highLevelRec.label}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => { window.location.href = "/pricing"; }}
                        style={{
                          padding: "10px 14px", borderRadius: 8,
                          background: "rgba(99,102,241,0.05)",
                          border: "1px dashed rgba(99,102,241,0.25)",
                          display: "flex", alignItems: "center", gap: 10,
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ fontSize: 14, color: "#9CA3AF" }}>🔒</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 2 }}>Recommendation</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#A5B4FC", fontFamily: "'Inter Tight',sans-serif" }}>
                            Proceed / Caution / Pass — unlock with Pro
                          </div>
                        </div>
                        <span style={{ fontSize: 11, color: "#818CF8" }}>→</span>
                      </div>
                    )}
                  </div>

                  <BlurGateSection
                    isUnlocked={tabUnlocked("memo")}
                    onUnlock={() => { unlockTab("memo"); }}
                    previewHeight={220}
                    headline="Unlock full diligence checklist and decision framework"
                    subtext="See the full memo — all risks by category, diligence questions, decision triggers, and detailed recommendation logic."
                    ctaLabel="Unlock Deal Memo →"
                    bullets={["Red flag detail by level","What must be true checklist","Diligence questions by category","Decision triggers + final recommendation"]}
                  >
                    {(() => {
                // Build structured memo props from live deal signals
                const loc    = [deal.city, deal.state].filter(Boolean).join(", ") || "undisclosed market";
                const indLbl = IL[deal.industry] || deal.industry;
                const gapStr = gp > 0 ? `${gp}% above` : `${Math.abs(gp)}% below`;

                const summary = `${indLbl} located in ${loc}. Asking ${fmt(deal.asking_price)} at ${deal.valuation_multiple.toFixed(2)}x SDE — ${gapStr} the NexTax fair value of ${fmt(fv)}. Overall score ${deal.overall_score}/100 — ${deal.risk_level} Risk.`;

                const mustBeTrue = [
                  `SDE of ${fmt(usableSDE)} is the earnings basis used for scoring${usableSDE !== (deal.sde ?? 0) ? " (trust-adjusted — see normalization flags)" : ""}`,
                  `DSCR of ${deal.dscr.toFixed(2)}x holds under normalized owner compensation`,
                  `Revenue trend is stable or growing — no single-customer concentration above 20%`,
                  `No undisclosed liabilities, lease assignment issues, or pending litigation`,
                ];

                const diligencePriorities = [
                  "Request 3 years of tax returns and P&Ls prior to LOI",
                  "Validate customer list and contract transferability",
                  "Confirm lease terms and assignment clause",
                  `Stress-test usable SDE to ${fmt(usableSDE * 0.85)} (−15%) — DSCR at ${stressDscr15}x`,
                ];

                const finalRec = (() => {
                  const v = deal.verdict ?? dealVerdict(deal);
                  if (v === "high_conviction") return `🔥 HIGH CONVICTION — ${vd.subtext} Anchor at ${fmt(recOffer)}, move to LOI immediately after confirming add-backs.`;
                  if (v === "pursue")          return `🟢 PURSUE — ${vd.subtext} Anchor at ${fmt(recOffer)} and request 3 years of financials before LOI submission.`;
                  if (v === "investigate")     return `🟡 INVESTIGATE — ${vd.subtext} Validate SDE and add-backs before committing. Request 2 years of tax returns.`;
                  if (v === "manual_review")   return `⚠️ MANUAL REVIEW REQUIRED — Normalization flags indicate data quality concerns. Do not advance until financials are independently verified.`;
                  return `🔴 PASS — ${vd.subtext} Do not advance at current pricing. Requires ${gp > 0 ? `${gp}% price reduction` : "structural improvement"} to become viable.`;
                })();

                // Build dealMemo input from existing panel state
                const memoInput = {
                  asking_price:     deal.asking_price,
                  usableSDE:        usableSDE,
                  reportedSDE:      deal.sde ?? 0,
                  dscr:             deal.dscr,
                  stressDscr15:     stressDscr15,
                  stressDscr25:     stressDscr25,
                  industry:         deal.industry,
                  industryFit:      (INDUSTRY_FIT[deal.industry] ?? "requires_review") as any,
                  trustScore:       deal.normalization_trust_score ?? 100,
                  earningsSource:   (deal.earnings_source as any) ?? "reported",
                  gap_pct:          deal.gap_pct ?? null,
                  valuation_multiple: deal.valuation_multiple,
                  owner_operated:         deal.owner_operated ?? null,
                  customer_concentration: deal.customer_concentration ?? null,
                  has_real_estate:        deal.has_real_estate ?? null,
                  years_in_business:      deal.years_in_business ?? null,
                  manual_review_required: deal.manual_review_required ?? false,
                };

                const riskFlags        = buildRiskFlags(memoInput);
                const questionGroups   = buildDiligenceQuestions(memoInput);
                const decisionTriggers = buildDecisionTriggers(memoInput);

                return (
                  <DealMemoTab
                    summary={summary}
                    mustBeTrue={mustBeTrue}
                    riskFlags={riskFlags}
                    diligencePriorities={diligencePriorities}
                    questionGroups={questionGroups}
                    decisionTriggers={decisionTriggers}
                    finalRecommendation={finalRec}
                  />
                );
                    })()}
                  </BlurGateSection>
                </>
                );
              })()}

          {activeTab === "comps" && (() => {
            const compsMarketPosition = buildMarketPosition(deal);
            const indTeaser = SCORE_INDUSTRIES[deal.industry];
            const lowTeaser   = indTeaser?.benchmarkLow  ?? 2.0;
            const highTeaser  = indTeaser?.benchmarkHigh ?? 3.5;
            const multTeaser  = deal.valuation_multiple ?? 0;
            const pricingColor = compsMarketPosition.pricingLabel === "Well Below Market"          ? "#2DD4BF"
                               : compsMarketPosition.pricingLabel === "Below Market"               ? "#10B981"
                               : compsMarketPosition.pricingLabel === "At Market"                  ? "#F59E0B"
                               : compsMarketPosition.pricingLabel === "Above Market"               ? "#F97316"
                               :                                                                     "#EF4444";
            const teaserImplication =
              multTeaser > highTeaser * 1.5 ? `At ${multTeaser.toFixed(2)}x, this deal is priced far outside the ${lowTeaser.toFixed(2)}x–${highTeaser.toFixed(2)}x benchmark range for this industry.`
              : multTeaser > highTeaser    ? `At ${multTeaser.toFixed(2)}x, this deal is priced above the ${lowTeaser.toFixed(2)}x–${highTeaser.toFixed(2)}x benchmark range.`
              : multTeaser < lowTeaser * 0.75 ? `At ${multTeaser.toFixed(2)}x, this deal is priced well below the ${lowTeaser.toFixed(2)}x–${highTeaser.toFixed(2)}x benchmark range.`
              : multTeaser < lowTeaser     ? `At ${multTeaser.toFixed(2)}x, this deal is priced below the ${lowTeaser.toFixed(2)}x–${highTeaser.toFixed(2)}x benchmark range.`
              :                              `At ${multTeaser.toFixed(2)}x, this deal sits within the ${lowTeaser.toFixed(2)}x–${highTeaser.toFixed(2)}x benchmark range.`;
            return (
            <>
              {/* ── FREE (always visible): range + outlier label + simple comparison ── */}
              <div style={{ marginBottom: 12, padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 10 }}>Market Position</div>

                {/* Range — large display */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span>Typical Market Range</span>
                    <InfoTooltip term="marketMultiple" size="sm" />
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#E2E8F0", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-0.01em" }}>
                    {lowTeaser.toFixed(2)}x – {highTeaser.toFixed(2)}x
                  </div>
                </div>

                {/* This deal position */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>This Deal</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: pricingColor, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-0.01em" }}>
                      {multTeaser.toFixed(2)}x
                    </span>
                    <span style={{
                      padding: "3px 10px", borderRadius: 20,
                      background: `${pricingColor}18`, border: `1px solid ${pricingColor}55`,
                      fontSize: 11, fontWeight: 700, color: pricingColor,
                      fontFamily: "'Inter Tight',sans-serif",
                    }}>
                      {multTeaser > highTeaser * 1.5 ? "Extreme Outlier" : compsMarketPosition.pricingLabel}
                    </span>
                  </div>
                </div>

                {/* Simple comparison sentence */}
                <div style={{
                  padding: "9px 12px", borderRadius: 7,
                  background: `${pricingColor}10`, border: `1px solid ${pricingColor}33`,
                  fontSize: 12, color: "#B8C1CC", lineHeight: 1.55,
                }}>
                  {multTeaser > highTeaser * 1.5 ? "Priced far above typical market range for this industry."
                   : multTeaser > highTeaser     ? "Priced above typical market range for this industry."
                   : multTeaser < lowTeaser * 0.75 ? "Priced far below typical market range — investigate why."
                   : multTeaser < lowTeaser     ? "Priced below typical market range — investigate seller motivation."
                   :                              "Priced within typical market range for this industry."}
                </div>
              </div>

            <BlurGateSection
              isUnlocked={tabUnlocked("comps")}
              onUnlock={() => { unlockTab("comps"); }}
              previewHeight={200}
              headline="See real comps and where this deal ranks"
              subtext="Unlock percentile positioning, comparable transactions, and adjusted vs reported earnings analysis."
              ctaLabel="Unlock Market Comps"
              footerNote="1 free unlock available · Upgrade to Pro for full market positioning"
              bullets={["Percentile ranking within the market","Representative comparable transactions","Adjusted vs reported earnings detail","Full range comparison and data sources"]}
            >
              {/* ── Percentile Positioning — where this deal sits in the IQR distribution ── */}
              {benchmarkIqr && benchmarkIqr.p25 != null && benchmarkIqr.median != null && benchmarkIqr.p75 != null && benchmarkIqr.percentile != null && (
                (() => {
                  const mult = deal.valuation_multiple ?? 0;
                  const p25  = benchmarkIqr.p25!;
                  const med  = benchmarkIqr.median!;
                  const p75  = benchmarkIqr.p75!;
                  const pct  = benchmarkIqr.percentile!;
                  const n    = benchmarkIqr.sample_size;
                  // Position deal marker along IQR bar — clamp to [0%, 100%] of visual span
                  // Display range extends 20% beyond p75 on the right
                  const displayMax = p75 * 1.2;
                  const displayMin = Math.max(0, p25 * 0.5);
                  const markerPct  = Math.max(2, Math.min(98, ((mult - displayMin) / (displayMax - displayMin)) * 100));
                  const p25pct     = ((p25 - displayMin) / (displayMax - displayMin)) * 100;
                  const medPct     = ((med - displayMin) / (displayMax - displayMin)) * 100;
                  const p75pct     = ((p75 - displayMin) / (displayMax - displayMin)) * 100;

                  // Interpretation color
                  const pctColor = pct >= 85 ? "#EF4444" : pct >= 65 ? "#F59E0B" : pct <= 25 ? "#10B981" : "#A5B4FC";
                  const pctLabel = pct >= 90 ? "Extreme outlier — priced far above comparable closed deals"
                                 : pct >= 75 ? "Above the 75th percentile — priced richer than 3-in-4 comparable deals"
                                 : pct >= 50 ? "Above median — priced higher than half of comparable deals"
                                 : pct >= 25 ? "Below median — priced lower than half of comparable deals"
                                 :             "Below the 25th percentile — priced cheaper than 3-in-4 comparable deals";

                  return (
                    <div style={{
                      padding: "14px 16px", borderRadius: 10, marginBottom: 14,
                      background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.18)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" as const, marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 3, display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <span>Percentile Positioning</span>
                            <InfoTooltip term="percentile" size="sm" />
                          </div>
                          <div style={{ fontSize: 11, color: "#7C8593" }}>
                            Based on {n} closed {n === 1 ? "transaction" : "transactions"} in this industry
                          </div>
                        </div>
                        <div style={{
                          padding: "5px 12px", borderRadius: 8,
                          background: `${pctColor}14`, border: `1px solid ${pctColor}44`,
                        }}>
                          <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 1 }}>This Deal</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: pctColor, fontFamily: "'JetBrains Mono',monospace" }}>
                            {pct}<span style={{ fontSize: 11, fontWeight: 500, color: `${pctColor}BB` }}>th pct</span>
                          </div>
                        </div>
                      </div>

                      {/* IQR bar — visual distribution */}
                      <div style={{ position: "relative" as const, height: 52, marginBottom: 4 }}>
                        {/* Background track */}
                        <div style={{
                          position: "absolute" as const, top: 24, left: 0, right: 0, height: 4,
                          borderRadius: 2, background: "rgba(255,255,255,0.05)",
                        }} />
                        {/* IQR band (25th-75th) */}
                        <div style={{
                          position: "absolute" as const, top: 24,
                          left: `${p25pct}%`, width: `${p75pct - p25pct}%`,
                          height: 4, borderRadius: 2,
                          background: "rgba(99,102,241,0.35)",
                        }} />
                        {/* P25 tick */}
                        <div style={{ position: "absolute" as const, left: `${p25pct}%`, top: 20, transform: "translateX(-50%)", width: 2, height: 12, background: "#64748B" }} />
                        <div style={{ position: "absolute" as const, left: `${p25pct}%`, top: 36, transform: "translateX(-50%)", fontSize: 9, color: "#6B7280", fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap" as const }}>
                          P25 · {p25.toFixed(1)}x
                        </div>
                        {/* Median tick */}
                        <div style={{ position: "absolute" as const, left: `${medPct}%`, top: 18, transform: "translateX(-50%)", width: 2, height: 16, background: "#A5B4FC" }} />
                        <div style={{ position: "absolute" as const, left: `${medPct}%`, top: 36, transform: "translateX(-50%)", fontSize: 9, color: "#A5B4FC", fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap" as const, fontWeight: 600 }}>
                          Median · {med.toFixed(1)}x
                        </div>
                        {/* P75 tick */}
                        <div style={{ position: "absolute" as const, left: `${p75pct}%`, top: 20, transform: "translateX(-50%)", width: 2, height: 12, background: "#64748B" }} />
                        <div style={{ position: "absolute" as const, left: `${p75pct}%`, top: 36, transform: "translateX(-50%)", fontSize: 9, color: "#6B7280", fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap" as const }}>
                          P75 · {p75.toFixed(1)}x
                        </div>
                        {/* Deal marker — the pin */}
                        <div style={{
                          position: "absolute" as const, left: `${markerPct}%`, top: 8,
                          transform: "translateX(-50%)",
                          display: "flex", flexDirection: "column" as const, alignItems: "center",
                          pointerEvents: "none" as const,
                        }}>
                          <div style={{
                            fontSize: 10, fontWeight: 700, color: pctColor,
                            fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap" as const,
                            padding: "1px 6px", borderRadius: 4,
                            background: "#0D1117", border: `1px solid ${pctColor}`,
                          }}>
                            {mult.toFixed(2)}x
                          </div>
                          <div style={{ width: 2, height: 6, background: pctColor, marginTop: 1 }} />
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: pctColor, border: "2px solid #0D1117", boxShadow: `0 0 0 2px ${pctColor}55` }} />
                        </div>
                      </div>

                      <div style={{
                        marginTop: 14, padding: "9px 11px", borderRadius: 7,
                        background: `${pctColor}10`, border: `1px solid ${pctColor}22`,
                        fontSize: 12, color: "#C4C8D1", lineHeight: 1.55,
                      }}>
                        {pctLabel}
                      </div>
                    </div>
                  );
                })()
              )}

              <CompsTab
                benchmarkContext={buildBenchmarkContext(deal)}
                marketPosition={compsMarketPosition}
                normalization={buildNormalizationContext(deal)}
                compsData={compsData}
                insights={(() => {
                  const ind     = SCORE_INDUSTRIES[deal.industry];
                  const low     = ind?.benchmarkLow  ?? 2.0;
                  const high    = ind?.benchmarkHigh ?? 3.5;
                  const mult    = deal.valuation_multiple ?? 0;
                  const gp      = deal.gap_pct ?? 0;
                  const dscr    = deal.dscr ?? 0;
                  const trust   = deal.normalization_trust_score ?? 100;
                  const isProxy = deal.benchmark_is_proxy;
                  const bullets: string[] = [];

                  // Pricing position — decisive
                  if (mult > high * 1.5) {
                    bullets.push(`Current pricing sits well above the range most buyers would consider financeable. At ${mult.toFixed(2)}x, this deal requires exceptional earnings quality or strategic rationale to justify.`);
                  } else if (mult > high) {
                    bullets.push(`Asking multiple of ${mult.toFixed(2)}x exceeds the typical ${low.toFixed(2)}x–${high.toFixed(2)}x benchmark range. This deal would likely need significant repricing to fall back into a normal market band.`);
                  } else if (mult < low * 0.75) {
                    bullets.push(`Asking multiple of ${mult.toFixed(2)}x is well below the ${low.toFixed(2)}x–${high.toFixed(2)}x benchmark range. If earnings are credible, this may represent an attractive entry point — investigate seller motivation.`);
                  } else {
                    bullets.push(`Asking multiple of ${mult.toFixed(2)}x falls within the typical ${low.toFixed(2)}x–${high.toFixed(2)}x current benchmark range for this industry.`);
                  }

                  // Fair value gap — actionable
                  if (gp > 20) {
                    bullets.push(`NexTax fair value estimate implies this deal is ${gp}% above market pricing. Normalized earnings imply materially lower value than the listing suggests.`);
                  } else if (gp < -15) {
                    bullets.push(`NexTax fair value estimate implies this deal is priced ${Math.abs(gp)}% below market. Validate earnings quality before treating this as confirmed upside.`);
                  }

                  // DSCR — financing reality
                  if (dscr < 1.0) {
                    bullets.push(`DSCR of ${dscr.toFixed(2)}x means this deal cannot service standard SBA or bank debt at current terms. Financing at the ask is not viable.`);
                  } else if (dscr < 1.25) {
                    bullets.push(`DSCR of ${dscr.toFixed(2)}x falls below the 1.25x minimum most lenders require. Expect financing challenges or required equity injection.`);
                  } else if (dscr >= 1.5) {
                    bullets.push(`DSCR of ${dscr.toFixed(2)}x provides solid debt coverage headroom. Financing is viable at current terms.`);
                  }

                  // Normalization signal
                  if (trust < 60) {
                    bullets.push(`Data confidence score of ${trust}/100 indicates reported financials appear unreliable. Use adjusted SDE — not broker-stated SDE — in your offer logic.`);
                  } else if (trust < 80) {
                    bullets.push(`Data confidence score of ${trust}/100 — request verified financials before relying on current earnings figures.`);
                  }

                  // Proxy note
                  if (isProxy) {
                    bullets.push(`Benchmark data is sourced from the closest available RMA proxy — not a direct industry match. Interpret comparisons with appropriate context.`);
                  }

                  return bullets;
                })()}
                decision={buildDecisionContext(deal)}
              />
            </BlurGateSection>
            </>
            );
          })()}
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
        <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
        <h2 style={{
          fontSize: 22, fontWeight: 700, color: "#F1F5F9", margin: "0 0 8px",
          fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.02em",
        }}>
          Continue your deal analysis
        </h2>
        <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 28px", lineHeight: 1.6 }}>
          Enter your email to pick up where you left off.
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
                color: email ? "#fff" : "#7C8593",
                fontSize: 14, fontWeight: 600,
                cursor: email && !loading ? "pointer" : "not-allowed",
              }}
            >
              {loading ? "Sending..." : "Send me a secure link →"}
            </button>
            <p style={{ fontSize: 11, color: "#6B7280", marginTop: 10 }}>
              Already analyzed a deal?{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); }} style={{ color: "#818CF8", textDecoration: "none" }}>
                Pick up where you left off →
              </a>
            </p>
          </div>
        ) : (
          <div style={{
            background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)",
            borderRadius: 14, padding: 24,
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📬</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#E2E8F0", marginBottom: 8 }}>
              Check your inbox ✉️
            </div>
            <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 8, lineHeight: 1.6 }}>
              Secure link sent to <strong style={{ color: "#E2E8F0" }}>{email}</strong>
            </div>
            <div style={{ fontSize: 12, color: "#818CF8", lineHeight: 1.6 }}>
              Click it to continue your analysis — your deals are saved and waiting.
            </div>
          </div>
        )}

        <div style={{ marginTop: 20, fontSize: 12, color: "#6B7280", lineHeight: 1.8 }}>
          No account?{" "}
          <a href="/deal-reality-check" style={{ color: "#6366F1", textDecoration: "none" }}>
            Run a free deal analysis →
          </a>
          <br />
          <span style={{ color: "#6B7280" }}>Prefer a password?{" "}</span>
          <a href="/account/security" style={{ color: "#7C8593", textDecoration: "none" }}>
            Set one up in account settings →
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
            fontSize: 10, color: "#7C8593", textTransform: "uppercase",
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
          <div style={{ fontSize: 11, color: "#6B7280" }}>{c.sub}</div>
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
              fontSize: 10, color: "#7C8593", textTransform: "uppercase",
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
            <div style={{ fontSize: 11, color: "#7C8593" }}>
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
              <div style={{ fontSize: 10, color: "#7C8593" }}>{a.sub}</div>
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
            fontSize: 10, color: "#6B7280", textTransform: "uppercase",
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
              <span style={{ fontSize: 10, color: "#7C8593" }}>{r.label}</span>
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
          <div style={{ marginTop: 8, fontSize: 10, color: "#6B7280", textAlign: "center" }}>
            🔒 Upgrade to unlock
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── TAB: HOME ────────────────────────────────────────────────────────────────

function TabHome({
  deals, dri, trending, loading, loadingMkt, isPro, favorites, outcomesMap,
  onTabChange, onToggleFav, onOpenNotes, onOpenDetail, onOpenUnderwriting, onOpenOutcome, onAnalyzeNew,
}: {
  deals: DealRun[];
  dri: DriSnapshot[];
  trending: TrendingMultiple[];
  loading: boolean;
  loadingMkt: boolean;
  isPro: boolean;
  favorites: Set<string>;
  outcomesMap: Map<string, DealOutcome>;
  onTabChange: (tab: TabId) => void;
  onToggleFav: (id: string) => void;
  onOpenNotes: (deal: DealRun) => void;
  onOpenDetail: (deal: DealRun) => void;
  onOpenUnderwriting: (deal: DealRun) => void;
  onOpenOutcome: (deal: DealRun) => void;
  onAnalyzeNew: () => void;
}) {
  // ─── STATE GATE ──────────────────────────────────────────────────────────
  // Rule: deals.length === 0 → State A (empty hero).  deals.length > 0 → State B (momentum hero).
  const isEmpty = deals.length === 0 && !loading;

  // ─── DECISION FEED — deterministic signals from existing data ────────────
  // Builds a list of short, action-oriented insights. Only signals where
  // we can reliably detect the trigger from deal fields we already store.
  // Max 4 items, newest first, hidden section if empty.
  type FeedItem = {
    kind:      "declining" | "improving" | "stale" | "low_trust" | "needs_review" | "outcome" | "dscr_drop" | "gap_widened" | "fresh";
    deal:      DealRun;
    severity:  "red" | "amber" | "green" | "blue" | "gray";
    text:      React.ReactNode;
    timestamp: number;   // used for "newest first" sort
  };

  const feedItems: FeedItem[] = (() => {
    if (deals.length === 0) return [];
    const items: FeedItem[] = [];
    const nowMs = Date.now();
    const DAY_MS = 86_400_000;

    for (const d of deals) {
      const createdMs = d.created_at ? new Date(d.created_at).getTime() : nowMs;
      const daysSince = Math.floor((nowMs - createdMs) / DAY_MS);
      const label     = IL[d.industry] || d.industry;

      // Compute trajectory signal using same logic as TrajectoryChip
      // (lightweight inline version — full module is in lib/dealTrajectory.ts)
      const margin    = (d as any).margin_yoy_pct ?? null;
      const revYoy    = (d as any).revenue_yoy_pct ?? null;
      const dscrDrop  = d.dscr != null && d.dscr < 1.25;
      const gap       = d.gap_pct ?? 0;
      const gapWide   = Math.abs(gap) >= 25;
      const trust     = d.normalization_trust_score ?? 100;
      const outcome   = outcomesMap.get(d.id);

      // 1. Trajectory declining — weighted negative signals
      if ((margin != null && margin <= -3) || (revYoy != null && revYoy <= -10)) {
        items.push({
          kind: "declining", deal: d, severity: "red",
          text: <><strong style={{ color: "#F87171", fontWeight: 600 }}>{label}</strong> trajectory turned declining — margin or revenue compression detected</>,
          timestamp: createdMs + daysSince * 1000,
        });
      }
      // 2. Trajectory improving — weighted positive signals
      else if ((margin != null && margin >= 2) || (revYoy != null && revYoy >= 10)) {
        items.push({
          kind: "improving", deal: d, severity: "green",
          text: <><strong style={{ color: "#10B981", fontWeight: 600 }}>{label}</strong> trajectory improving — margin or revenue expansion</>,
          timestamp: createdMs + daysSince * 1000,
        });
      }

      // 3. Stale listing — 90+ days on market (approximate from created_at for now)
      if (daysSince >= 90) {
        items.push({
          kind: "stale", deal: d, severity: "amber",
          text: <><strong style={{ color: "#F59E0B", fontWeight: 600 }}>{label}</strong> listed {daysSince} days — seller likely motivated</>,
          timestamp: createdMs + 1,
        });
      }

      // 4. Low trust score
      if (trust < 60) {
        items.push({
          kind: "low_trust", deal: d, severity: "red",
          text: <><strong style={{ color: "#F87171", fontWeight: 600 }}>{label}</strong> data confidence {trust}/100 — independently verify financials before proceeding</>,
          timestamp: createdMs + 2,
        });
      }

      // 5. DSCR dropped below threshold
      if (dscrDrop && d.dscr != null) {
        items.push({
          kind: "dscr_drop", deal: d, severity: "red",
          text: <><strong style={{ color: "#F87171", fontWeight: 600 }}>{label}</strong> DSCR {d.dscr.toFixed(2)}x — below SBA financing threshold</>,
          timestamp: createdMs + 3,
        });
      }

      // 6. Valuation gap widened materially
      if (gapWide) {
        const color = gap > 0 ? "#F59E0B" : "#10B981";
        items.push({
          kind: "gap_widened", deal: d, severity: gap > 0 ? "amber" : "green",
          text: <><strong style={{ color, fontWeight: 600 }}>{label}</strong> priced {gap > 0 ? "+" : ""}{gap}% vs fair value — {gap > 0 ? "significant overpricing" : "potential opportunity"}</>,
          timestamp: createdMs + 4,
        });
      }

      // 7. Review needed — saved 7+ days ago, no outcome recorded
      if (daysSince >= 7 && !outcome) {
        items.push({
          kind: "needs_review", deal: d, severity: "gray",
          text: <><strong style={{ color: "#C4C8D1", fontWeight: 600 }}>Review needed:</strong> <span style={{ color: "#94A3B8" }}>{label}</span> saved {daysSince} days ago with no decision recorded</>,
          timestamp: createdMs + 5,
        });
      }

      // 8. New outcome recorded (timestamped after save)
      if (outcome && outcome.updated_at) {
        const outMs = new Date(outcome.updated_at).getTime();
        const daysAgoOutcome = Math.floor((nowMs - outMs) / DAY_MS);
        if (daysAgoOutcome <= 30) {  // only surface recent outcomes
          items.push({
            kind: "outcome", deal: d, severity: "green",
            text: <><strong style={{ color: "#10B981", fontWeight: 600 }}>{label}</strong> outcome recorded — {OUTCOME_LABELS[outcome.outcome].toLowerCase()}{outcome.final_price ? ` at ${fmt(outcome.final_price)}` : ""}</>,
            timestamp: outMs,
          });
        }
      }

      // 9. Fresh deal (analyzed within last 3 days) — only if no other signal already fired
      if (daysSince <= 3) {
        items.push({
          kind: "fresh", deal: d, severity: "blue",
          text: <><strong style={{ color: "#60A5FA", fontWeight: 600 }}>{label}</strong> newly analyzed — review the verdict</>,
          timestamp: createdMs + 6,
        });
      }
    }

    // Dedupe by (kind, deal.id) — keep newest. Then sort by timestamp desc, cap at 4.
    const seen = new Set<string>();
    const deduped: FeedItem[] = [];
    for (const item of items.sort((a, b) => b.timestamp - a.timestamp)) {
      const key = `${item.kind}:${item.deal.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
      if (deduped.length >= 4) break;
    }
    return deduped;
  })();

  // ─── STATE B: MOMENTUM METRICS ───────────────────────────────────────────
  const dealsNeedingAttention = deals.filter(d => {
    const trust  = d.normalization_trust_score ?? 100;
    const dscr   = d.dscr ?? 2;
    const gapAbs = Math.abs(d.gap_pct ?? 0);
    return trust < 60 || dscr < 1.25 || gapAbs >= 25;
  });
  const dealsAwaitingOutcome = deals.filter(d => {
    if (outcomesMap.has(d.id)) return false;
    const createdMs = d.created_at ? new Date(d.created_at).getTime() : Date.now();
    const daysSince = Math.floor((Date.now() - createdMs) / 86_400_000);
    return daysSince >= 7;
  });
  const topDeal = dealsNeedingAttention[0] ?? deals[0] ?? null;

  // Top 3 most-recent deals for the "Your deals" list in State B
  const recent = deals.slice(0, 3);

  // Sample-modal state for "View sample" button (future: replace with real sample deal)
  const [showSampleModal, setShowSampleModal] = useState(false);

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div>

      {/* ══ STATE A ═══════════════════════════════════════════════════════════
           First-time user (no deals yet). Aspirational hero + simple flow + quick actions. */}
      {/* ══ ASPIRATIONAL HERO — always visible at top of Home tab ════════════
           Product identity + primary CTA. Renders for empty AND returning users.
           The 1-2-3 onboarding flow below is gated to empty state only. */}
      <div style={{
        background: "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(16,185,129,0.03))",
        borderRadius: 14,
        padding: "32px 28px",
        marginBottom: 16,
        border: "1px solid rgba(99,102,241,0.15)",
        display: "grid",
        gridTemplateColumns: isEmpty ? "minmax(0, 1.3fr) minmax(0, 1fr)" : "1fr",
        gap: 28,
        alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 10, color: "#A5B4FC", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 500, marginBottom: 10 }}>
            NexTax Intelligence
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#F1F5F9", margin: "0 0 10px", lineHeight: 1.15, letterSpacing: "-0.02em", fontFamily: "'Inter Tight',sans-serif", maxWidth: 640 }}>
            Stack deals. Benchmark them. Choose the winner.
          </h1>
          <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6, margin: "0 0 20px", maxWidth: 620 }}>
            Analyze, compare, and pressure-test opportunities with lender-ready underwriting, real comps, and LOI guidance — all in one workflow.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
            <button
              onClick={onAnalyzeNew}
              style={{
                padding: "11px 22px", borderRadius: 9, border: "none",
                background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
                color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Analyze a deal →
            </button>
            <button
              onClick={() => setShowSampleModal(true)}
              style={{
                padding: "11px 18px", borderRadius: 9,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.03)",
                color: "#E2E8F0", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              See a sample deal
            </button>
          </div>
        </div>
        {/* 1-2-3 onboarding flow — only for empty-state users */}
        {isEmpty && (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
              {[
                { n: "1", title: "Paste listing details", sub: "Asking price, SDE, industry — that's it", good: false },
                { n: "2", title: "We analyze it",          sub: "Against 1,500+ closed deals + industry benchmarks", good: false },
                { n: "3", title: "Get your verdict",       sub: "Proceed · Investigate · Pass", good: true },
              ].map(step => (
                <div key={step.n} style={{
                  padding: "11px 14px", borderRadius: 9,
                  background: step.good ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.02)",
                  border:     step.good ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", gap: 11,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: step.good ? "rgba(16,185,129,0.15)" : "rgba(99,102,241,0.15)",
                    color:      step.good ? "#10B981" : "#A5B4FC",
                    fontSize: 11, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {step.n}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#F1F5F9", fontWeight: 600 }}>{step.title}</div>
                    <div style={{ fontSize: 10, color: step.good ? "#10B981" : "#7C8593", fontWeight: step.good ? 500 : 400 }}>{step.sub}</div>
                  </div>
                </div>
              ))}
            </div>
        )}
      </div>

      {/* Quick Actions — empty state only (onboarding aid) */}
      {isEmpty && (
      <div style={{
            padding: "16px 18px", borderRadius: 10,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 12 }}>
              Quick actions
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
              {[
                { icon: "+", label: "Analyze deal",   primary: true,  onClick: onAnalyzeNew },
                { icon: "↑", label: "Import listing", primary: false, onClick: onAnalyzeNew },  // same flow for now
                { icon: "◎", label: "Sample deal",    primary: false, onClick: () => setShowSampleModal(true) },
                { icon: "?", label: "How it works",   primary: false, onClick: () => onTabChange("market-intel") },
              ].map((a, i) => (
                <div
                  key={i}
                  onClick={a.onClick}
                  style={{
                    padding: "14px 10px", borderRadius: 9,
                    background: a.primary ? "rgba(99,102,241,0.07)" : "rgba(255,255,255,0.02)",
                    border:     a.primary ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(255,255,255,0.06)",
                    cursor: "pointer", textAlign: "center" as const,
                    transition: "background 140ms ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = a.primary ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = a.primary ? "rgba(99,102,241,0.07)" : "rgba(255,255,255,0.02)"; }}
                >
                  <div style={{ fontSize: 18, marginBottom: 6, color: a.primary ? "#A5B4FC" : "#7C8593" }}>{a.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: a.primary ? 600 : 500, color: a.primary ? "#A5B4FC" : "#C4C8D1" }}>{a.label}</div>
                </div>
              ))}
            </div>
          </div>
      )}

      {/* ══ STATE B ═══════════════════════════════════════════════════════════
           Returning user — momentum hero surfacing attention-needed deals, then list, then feed. */}
      {!isEmpty && (
        <>
          {/* Momentum hero — clickable if dealsNeedingAttention.length > 0 */}
          <div style={{
            padding: "22px 24px", borderRadius: 14,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.08)",
            marginBottom: 14,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" as const }}>
              <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                <div style={{ fontSize: 10, color: "#A5B4FC", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500, marginBottom: 6 }}>
                  Your pipeline
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: "#F1F5F9", margin: "0 0 4px", letterSpacing: "-0.015em", fontFamily: "'Inter Tight',sans-serif" }}>
                  {deals.length} {deals.length === 1 ? "deal" : "deals"} in progress
                </h2>
                <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>
                  {dealsNeedingAttention.length > 0 ? (
                    <span
                      onClick={() => { if (topDeal) onOpenDetail(topDeal); }}
                      style={{ color: "#F59E0B", fontWeight: 500, cursor: "pointer", borderBottom: "1px dashed rgba(245,158,11,0.4)" }}
                    >
                      {dealsNeedingAttention.length} {dealsNeedingAttention.length === 1 ? "deal needs" : "deals need"} your attention
                    </span>
                  ) : (
                    <span style={{ color: "#10B981", fontWeight: 500 }}>Pipeline looks clean — no urgent action</span>
                  )}
                  {dealsAwaitingOutcome.length > 0 && (
                    <> · {dealsAwaitingOutcome.length} awaiting outcome recording</>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                {topDeal && (
                  <button
                    onClick={() => onOpenUnderwriting(topDeal)}
                    style={{
                      padding: "10px 18px", borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.03)",
                      color: "#E2E8F0", fontSize: 12, fontWeight: 500,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    Continue analysis
                  </button>
                )}
                <button
                  onClick={onAnalyzeNew}
                  style={{
                    padding: "10px 20px", borderRadius: 8, border: "none",
                    background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
                    color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  + Analyze new deal
                </button>
              </div>
            </div>
          </div>

          {/* Your deals — compact list with trajectory chips */}
          <div style={{
            padding: 0, borderRadius: 12,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            overflow: "hidden",
            marginBottom: 14,
          }}>
            <div style={{
              padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(255,255,255,0.01)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>Your deals</div>
                <div style={{ fontSize: 10, color: "#7C8593", marginTop: 1 }}>Pulled back in — here's where you left off</div>
              </div>
              {deals.length > 3 && (
                <div
                  onClick={() => onTabChange("my-deals")}
                  style={{ fontSize: 11, color: "#A5B4FC", cursor: "pointer" }}
                >
                  View all {deals.length} →
                </div>
              )}
            </div>

            {recent.map((deal, i) => {
              const label = IL[deal.industry] || deal.industry;
              const loc   = [deal.city, deal.state].filter(Boolean).join(", ");
              // Compute trajectory label from fields we have
              const margin   = (deal as any).margin_yoy_pct ?? null;
              const revYoy   = (deal as any).revenue_yoy_pct ?? null;
              const trajLabel = (margin != null && margin <= -3) || (revYoy != null && revYoy <= -10) ? "Declining"
                              : (margin != null && margin >= 2)  || (revYoy != null && revYoy >= 10)  ? "Improving"
                              :                                                                          "Flat";
              const trajColor = trajLabel === "Improving" ? "#10B981"
                              : trajLabel === "Declining" ? "#F87171"
                              :                             "#94A3B8";
              const trajGlyph = trajLabel === "Improving" ? "▲"
                              : trajLabel === "Declining" ? "▼"
                              :                             "—";
              // Status — outcome > review needed > in-progress
              const outcome = outcomesMap.get(deal.id);
              const createdMs = deal.created_at ? new Date(deal.created_at).getTime() : Date.now();
              const daysSince = Math.floor((Date.now() - createdMs) / 86_400_000);
              const needsReview = daysSince >= 7 && !outcome;
              const statusText = outcome
                ? OUTCOME_LABELS[outcome.outcome]
                : needsReview
                ? "Needs review"
                : daysSince === 0 ? "Just added"
                : `Saved ${daysSince} ${daysSince === 1 ? "day" : "days"} ago`;
              const statusColor = outcome ? OUTCOME_COLORS[outcome.outcome].text
                                : needsReview ? "#F59E0B"
                                : "#94A3B8";

              return (
                <div
                  key={deal.id}
                  style={{
                    padding: "11px 16px",
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 0.9fr) minmax(0, 0.9fr) auto",
                    gap: 14,
                    alignItems: "center",
                    borderBottom: i < recent.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#F1F5F9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                      {label}{loc ? ` · ${loc}` : ""}
                    </div>
                    <div style={{ fontSize: 10, color: "#7C8593", fontFamily: "'JetBrains Mono',monospace", marginTop: 1 }}>
                      {fmt(deal.asking_price)} · {deal.valuation_multiple.toFixed(2)}x
                    </div>
                  </div>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "3px 9px", borderRadius: 20,
                    background: `${trajColor}14`, border: `1px solid ${trajColor}44`,
                    width: "fit-content",
                  }}>
                    <span style={{ color: trajColor, fontSize: 9, fontWeight: 700 }}>{trajGlyph}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: trajColor }}>{trajLabel}</span>
                  </div>
                  <div style={{ fontSize: 11, color: statusColor, fontWeight: needsReview || outcome ? 500 : 400 }}>
                    {statusText}
                  </div>
                  <button
                    onClick={() => onOpenUnderwriting(deal)}
                    style={{
                      padding: "5px 11px", borderRadius: 6,
                      border: "1px solid rgba(99,102,241,0.35)",
                      background: "rgba(99,102,241,0.1)",
                      color: "#A5B4FC", fontSize: 11, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const,
                    }}
                  >
                    View →
                  </button>
                </div>
              );
            })}
          </div>

          {/* Decision Feed — hidden if no signals */}
          {feedItems.length > 0 && (
            <div style={{
              padding: "14px 18px", borderRadius: 10,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              marginBottom: 14,
            }}>
              <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>
                Decision feed
              </div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                {feedItems.map((item, i) => {
                  const dotColor = item.severity === "red"   ? "#F87171"
                                 : item.severity === "amber" ? "#F59E0B"
                                 : item.severity === "green" ? "#10B981"
                                 : item.severity === "blue"  ? "#60A5FA"
                                 :                             "#94A3B8";
                  const bgColor  = item.severity === "red"   ? "rgba(239,68,68,0.04)"
                                 : item.severity === "amber" ? "rgba(245,158,11,0.04)"
                                 : item.severity === "green" ? "rgba(16,185,129,0.04)"
                                 : item.severity === "blue"  ? "rgba(96,165,250,0.04)"
                                 :                             "rgba(148,163,184,0.04)";
                  return (
                    <div
                      key={i}
                      onClick={() => onOpenUnderwriting(item.deal)}
                      style={{
                        display: "flex", gap: 10, alignItems: "flex-start",
                        padding: "8px 10px", borderRadius: 7,
                        background: bgColor,
                        cursor: "pointer",
                        transition: "background 140ms ease",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = bgColor.replace("0.04", "0.08"); }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = bgColor; }}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, marginTop: 6, flexShrink: 0 }} />
                      <div style={{ fontSize: 12, color: "#C4C8D1", lineHeight: 1.5, flex: 1 }}>
                        {item.text}
                      </div>
                      <span style={{ fontSize: 11, color: "#64748B", flexShrink: 0, alignSelf: "center" }}>→</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions — returning user has fewer, emphasizes ongoing work */}
          <div style={{
            padding: "14px 18px", borderRadius: 10,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>
              Quick actions
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
              {[
                { icon: "+", label: "Analyze deal",   primary: true,  onClick: onAnalyzeNew },
                { icon: "≡", label: "All deals",      primary: false, onClick: () => onTabChange("my-deals") },
                { icon: "⇄", label: "Compare",        primary: false, onClick: () => onTabChange("compare") },
                { icon: "◎", label: "Market intel",   primary: false, onClick: () => onTabChange("market-intel") },
              ].map((a, i) => (
                <div
                  key={i}
                  onClick={a.onClick}
                  style={{
                    padding: "12px 10px", borderRadius: 9,
                    background: a.primary ? "rgba(99,102,241,0.07)" : "rgba(255,255,255,0.02)",
                    border:     a.primary ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(255,255,255,0.06)",
                    cursor: "pointer", textAlign: "center" as const,
                    transition: "background 140ms ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = a.primary ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = a.primary ? "rgba(99,102,241,0.07)" : "rgba(255,255,255,0.02)"; }}
                >
                  <div style={{ fontSize: 16, marginBottom: 5, color: a.primary ? "#A5B4FC" : "#7C8593" }}>{a.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: a.primary ? 600 : 500, color: a.primary ? "#A5B4FC" : "#C4C8D1" }}>{a.label}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── SAMPLE MEMO PREVIEW MODAL — Pro-quality IC memo demo for free users ── */}
      {showSampleModal && (
        <SampleMemoPreviewModal
          onClose={() => setShowSampleModal(false)}
          onAnalyzeDeal={() => { setShowSampleModal(false); onAnalyzeNew(); }}
          onUpgrade={() => { setShowSampleModal(false); window.location.href = "/pricing"; }}
        />
      )}
    </div>
  );
}

// ─── TAB: DASHBOARD ───────────────────────────────────────────────────────────
// ─── TAB: DASHBOARD ───────────────────────────────────────────────────────────

function TabDashboard({
  deals, dri, trending, loading, loadingMkt, isPro, favorites, outcomesMap,
  onTabChange, onToggleFav, onOpenNotes, onOpenDetail, onOpenUnderwriting, onOpenOutcome, onAnalyzeNew,
}: {
  deals: DealRun[];
  dri: DriSnapshot[];
  trending: TrendingMultiple[];
  loading: boolean;
  loadingMkt: boolean;
  isPro: boolean;
  favorites: Set<string>;
  outcomesMap: Map<string, DealOutcome>;
  onTabChange: (tab: TabId) => void;
  onToggleFav: (id: string) => void;
  onOpenNotes: (deal: DealRun) => void;
  onOpenDetail: (deal: DealRun) => void;
  onOpenUnderwriting: (deal: DealRun) => void;
  onOpenOutcome: (deal: DealRun) => void;
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

      {/* Recent Activity + Top Opportunities side-by-side */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, marginBottom: 28 }}>
        {/* Recent deals */}
        <div>
          <SectionHeader
            title="Recent Deals"
            sub={loading ? "Loading…" : deals.length === 0 ? "No deals yet" : `${deals.length} saved`}
            action={
              <button
                onClick={onAnalyzeNew}
                style={{
                  padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(99,102,241,0.3)",
                  background: "rgba(99,102,241,0.08)", color: "#A5B4FC",
                  fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                + Analyze
              </button>
            }
          />
          {loading ? (
            <Card>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                {[0,1,2].map(i => <Skel key={i} h={56} />)}
              </div>
            </Card>
          ) : recent.length === 0 ? (
            <Card>
              <div style={{ fontSize: 13, color: "#7C8593", textAlign: "center" as const, padding: "20px 0" }}>
                Analyze your first deal to see it here.
              </div>
            </Card>
          ) : (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {recent.map((deal, i) => {
                const gp = deal.gap_pct ?? 0;
                const vd = verdictCfg(deal.verdict ?? dealVerdict(deal));
                return (
                  <div
                    key={deal.id}
                    onClick={() => onOpenDetail(deal)}
                    style={{
                      padding: "12px 16px",
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto auto",
                      gap: 12,
                      alignItems: "center",
                      cursor: "pointer",
                      borderBottom: i < recent.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                      transition: "background 140ms ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <Ring score={deal.overall_score} size={32} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#F1F5F9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                        {IL[deal.industry] || deal.industry}
                      </div>
                      <div style={{ fontSize: 10, color: "#7C8593", fontFamily: "'JetBrains Mono',monospace", marginTop: 1 }}>
                        {fmt(deal.asking_price)} · {deal.valuation_multiple.toFixed(2)}x
                      </div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: gp > 0 ? "#D85A30" : "#10B981", fontFamily: "'JetBrains Mono',monospace" }}>
                      {gp > 0 ? "+" : ""}{gp}%
                    </div>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "3px 8px", borderRadius: 6,
                      fontSize: 10, fontWeight: 700,
                      background: vd.bg, color: vd.color, border: `1px solid ${vd.border}`,
                      whiteSpace: "nowrap" as const,
                    }}>
                      {vd.emoji} {vd.label}
                    </span>
                  </div>
                );
              })}
            </Card>
          )}
        </div>

        {/* Top Opportunities */}
        <div>
          <SectionHeader title="Best Opportunities" sub="Deals priced below fair value" />
          {loading ? (
            <Card>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                {[0,1].map(i => <Skel key={i} h={44} />)}
              </div>
            </Card>
          ) : opps.length === 0 ? (
            <Card>
              <div style={{ fontSize: 12, color: "#7C8593", textAlign: "center" as const, padding: "14px 0" }}>
                No opportunities in your current deals yet.
              </div>
            </Card>
          ) : (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {opps.map((deal, i) => {
                const gp = deal.gap_pct ?? 0;
                return (
                  <div
                    key={deal.id}
                    onClick={() => onOpenDetail(deal)}
                    style={{
                      padding: "10px 14px",
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 10,
                      alignItems: "center",
                      cursor: "pointer",
                      borderBottom: i < opps.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#F1F5F9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                        {IL[deal.industry] || deal.industry}
                      </div>
                      <div style={{ fontSize: 10, color: "#7C8593", fontFamily: "'JetBrains Mono',monospace", marginTop: 1 }}>
                        {fmt(deal.asking_price)}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#10B981", fontFamily: "'JetBrains Mono',monospace" }}>
                      {gp}%
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      </div>

      {/* Market Signals — overpriced industries from DRI */}
      {overDri.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionHeader title="Market Signals" sub="Where buyers are currently overpaying" />
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {loadingMkt ? (
              <div style={{ padding: 16, display: "flex", flexDirection: "column" as const, gap: 8 }}>
                {[0,1,2].map(i => <Skel key={i} h={36} />)}
              </div>
            ) : (
              overDri.map((s, i) => (
                <div
                  key={s.industry_key}
                  style={{
                    padding: "10px 16px",
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: 12,
                    alignItems: "center",
                    borderBottom: i < overDri.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#E2E8F0", fontWeight: 500 }}>
                    {IL[s.industry_key] || s.industry_key}
                  </div>
                  <div style={{ fontSize: 11, color: "#D85A30", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>
                    +{(s.gap_pct ?? 0).toFixed(0)}%
                  </div>
                  <div style={{ fontSize: 10, color: "#7C8593" }}>
                    above market
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      )}

      {/* Compare Deals teaser */}
      {deals.length >= 2 && (
        <div style={{ marginBottom: 28 }}>
          <SectionHeader title="Compare Deals" sub="Side-by-side deal intelligence" />
          <Card style={{ position: "relative" as const }}>
            <div
              onClick={() => onTabChange("compare")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 14, cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.5 }}>
                Compare {deals.length} deals across pricing, coverage, risk, and quality.
              </div>
              <button
                style={{
                  padding: "7px 14px", borderRadius: 7, border: "none",
                  background: "rgba(99,102,241,0.12)", color: "#A5B4FC",
                  fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  whiteSpace: "nowrap" as const,
                }}
              >
                Open Compare →
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Pro Command Module — for Pro users only */}
      {isPro ? <ProCommandModule deals={deals} onOpenUnderwriting={onOpenUnderwriting} /> : <ProUpsellCard deals={deals} onOpenUnderwriting={onOpenUnderwriting} />}
    </div>
  );
}



// ─── TAB: MY DEALS ────────────────────────────────────────────────────────────

function TabMyDeals({
  deals, loading, isPro, dealStatuses, favorites, outcomesMap,
  onStatusChange, onToggleFav, onOpenNotes, onOpenDetail, onOpenUnderwriting, onOpenOutcome, onAnalyzeNew,
}: {
  deals: DealRun[];
  loading: boolean;
  isPro: boolean;
  dealStatuses: Record<string, DealStatus>;
  favorites: Set<string>;
  outcomesMap: Map<string, DealOutcome>;
  onStatusChange: (id: string, status: DealStatus) => void;
  onToggleFav: (id: string) => void;
  onOpenNotes: (deal: DealRun) => void;
  onOpenDetail: (deal: DealRun) => void;
  onOpenUnderwriting: (deal: DealRun) => void;
  onOpenOutcome: (deal: DealRun) => void;
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
            transform: "translateY(-50%)", fontSize: 13, color: "#7C8593",
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
          gridTemplateColumns: "180px 110px 100px 100px 60px 48px 140px 80px auto",
          gap: "0 8px", padding: "10px 18px",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.015)",
        }}>
          {([
            { h: "Deal",       align: "left"   },
            { h: "Industry",   align: "left"   },
            { h: "Asking",     align: "left"   },
            { h: "Fair Value", align: "left"   },
            { h: "Gap",        align: "left"   },
            { h: "Score",      align: "center" },
            { h: "Verdict",    align: "left"   },
            { h: "Status",     align: "left"   },
            { h: "Actions",    align: "center" },
          ] as { h: string; align: string }[]).map(({ h, align }) => (
            <div key={h} style={{
              fontSize: 10, color: "#6B7280", textTransform: "uppercase",
              letterSpacing: "0.08em", fontWeight: 600,
              textAlign: align as any,
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
              gridTemplateColumns: "180px 110px 100px 100px 60px 48px 140px 80px auto",
              gap: "0 8px", padding: "14px 18px",
              borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center",
            }}
          >
            {[120, 80, 80, 80, 40, 34, 100, 60, 100].map((w, j) => (
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
            <div style={{ fontSize: 12, color: "#7C8593", marginBottom: 14 }}>
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
              onClick={() => onOpenUnderwriting(deal)}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 110px 100px 100px 60px 48px 140px 80px auto",
                gap: "0 8px", padding: "13px 18px",
                borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                alignItems: "center", transition: "background 0.12s",
                cursor: "pointer",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {/* Deal name + meta */}
              <div>
                <div style={{
                  fontSize: 12, fontWeight: 700,
                  color: isFav ? "#F1F5F9" : "#E2E8F0",
                  display: "flex", alignItems: "center", gap: 4,
                  fontFamily: "'JetBrains Mono',monospace",
                }}>
                  {isFav && <span style={{ color: "#F59E0B", fontSize: 11 }}>★</span>}
                  {fmt(deal.asking_price)}
                </div>
                <div style={{ fontSize: 10, color: "#7C8593", marginTop: 2 }}>
                  {deal.valuation_multiple.toFixed(2)}x · DSCR {deal.dscr.toFixed(2)}
                </div>
                <div style={{ fontSize: 10, color: "#6B7280" }}>
                  {ago(deal.created_at)}{loc ? ` · ${loc}` : ""}
                </div>
              </div>

              {/* Industry */}
              <div style={{ fontSize: 11, color: "#7C8593" }}>
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
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Ring score={deal.overall_score} size={32} />
              </div>

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

              {/* Actions — stopPropagation; row itself triggers underwriting */}
              <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "center" }} onClick={e => e.stopPropagation()}>
                <StarButton dealId={deal.id} favorites={favorites} onToggle={onToggleFav} />
                <button onClick={(e) => { e.stopPropagation(); onOpenNotes(deal); }} title="Notes & Intel"
                  style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, cursor: "pointer", padding: "3px 6px", fontSize: 11, color: "#7C8593" }}>
                  📝
                </button>
                <button onClick={(e) => { e.stopPropagation(); onOpenDetail(deal); }} title="Quick View"
                  className="btn-qv"
                  style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#6B7280", fontSize: 10, cursor: "pointer" }}>
                  Quick View
                </button>
                <button onClick={(e) => { e.stopPropagation(); onOpenUnderwriting(deal); }} title="Open Underwriting"
                  className="btn-uw"
                  style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(99,102,241,0.35)", background: "rgba(99,102,241,0.12)", color: "#A5B4FC", fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as any }}>
                  Open Underwriting →
                </button>
              </div>
            </div>
          );
        })}
      </Card>

      {!loading && filtered.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 11, color: "#6B7280", textAlign: "right" }}>
          {filtered.length} deal{filtered.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

// ─── TAB: COMPARE ─────────────────────────────────────────────────────────────


// ── CompareRangeTrack — hero visual for Market Comps and Closed Comps ─────────
// Shows a horizontal track with low/median/high markers and a "Your Deal" dot.
// Supports out-of-range rendering cleanly on both ends.
function CompareRangeTrack({
  currentValue,
  low, median, high,
  label = "Your Deal",
  emptyText,
  accentColor = "#818CF8",
}: {
  currentValue:  number | null;
  low:           number;
  median:        number;
  high:          number;
  label?:        string;
  emptyText?:    string;
  accentColor?:  string;
}) {
  if (!currentValue || !low || !high || low >= high) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center" as const }}>
        <div style={{ fontSize: 11, color: "#6B7280" }}>{emptyText ?? "Range data unavailable"}</div>
      </div>
    );
  }

  const PAD = 12;           // % padding each side of track
  const USABLE = 100 - PAD * 2;

  function pos(v: number): number {
    const raw = ((v - low) / (high - low)) * USABLE + PAD;
    return Math.max(PAD - 4, Math.min(PAD + USABLE + 4, raw));
  }

  const isBelow  = currentValue < low;
  const isAbove  = currentValue > high;
  const isInside = !isBelow && !isAbove;

  const markerPct  = isBelow ? PAD - 3 : isAbove ? PAD + USABLE + 3 : pos(currentValue);
  const medianPct  = pos(median);

  const markerColor = isBelow  ? "#2DD4BF"
                    : isAbove  ? "#EF4444"
                    :            accentColor;

  // Extreme outlier threshold: >50% above high bound
  const isExtreme = currentValue > high * 1.5;
  const posLabel  = isBelow   ? "below range"
                  : isExtreme ? "extreme outlier"
                  : isAbove   ? "above range"
                  :             "in range";

  return (
    <div style={{ padding: "4px 0 8px" }}>
      {/* Value labels above track */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, padding: `0 ${PAD}%` }}>
        <span style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Low {low.toFixed(2)}x</span>
        <span style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Median {median.toFixed(2)}x</span>
        <span style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>High {high.toFixed(2)}x</span>
      </div>

      {/* Track */}
      <div style={{ position: "relative", height: 8, borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", margin: "0 0" }}>
        {/* Range fill */}
        <div style={{
          position: "absolute",
          left: `${PAD}%`, width: `${USABLE}%`,
          top: 0, bottom: 0, borderRadius: 3,
          background: "rgba(255,255,255,0.07)",
        }} />
        {/* Median tick */}
        <div style={{
          position: "absolute", left: `${medianPct}%`,
          top: -3, bottom: -3, width: 2,
          background: "rgba(255,255,255,0.25)",
          transform: "translateX(-50%)",
          borderRadius: 1,
        }} />
        {/* Current deal marker */}
        <div style={{
          position: "absolute",
          left: `${markerPct}%`,
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: 14, height: 14,
          borderRadius: "50%",
          background: markerColor,
          border: "2.5px solid #0D1117",
          boxShadow: `0 0 0 2px ${markerColor}55, 0 0 12px ${markerColor}44`,
          zIndex: 2,
          transition: "left 0.3s ease",
        }} />
      </div>

      {/* Badge anchored to the dot — position:relative wrapper so badge left matches markerPct */}
      <div style={{ position: "relative", marginTop: 10, height: 44 }}>
        {/* Far-left / far-right axis hint labels — only when in range so they don't crowd edge badge */}
        {isInside && (
          <>
            <span style={{ position: "absolute", left: 0, top: 14, fontSize: 9, color: "#2D3748" }}>← Low</span>
            <span style={{ position: "absolute", right: 0, top: 14, fontSize: 9, color: "#2D3748" }}>High →</span>
          </>
        )}
        {/* Badge — absolutely positioned at markerPct, clamped 5%–95% so it never bleeds off edge */}
        <div style={{
          position: "absolute",
          left: `${Math.max(5, Math.min(95, markerPct))}%`,
          top: 0,
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          gap: 2,
          whiteSpace: "nowrap" as const,
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 9px", borderRadius: 20,
            background: isInside ? `${markerColor}18` : isAbove ? "rgba(239,68,68,0.12)" : "rgba(45,212,191,0.12)",
            border: `1px solid ${markerColor}55`,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: markerColor, flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: markerColor, fontFamily: "'JetBrains Mono',monospace" }}>
              {currentValue.toFixed(2)}x
            </span>
            <span style={{ fontSize: 9, color: markerColor + "bb" }}>{label}</span>
          </div>
          <div style={{ fontSize: 9, color: markerColor + "99" }}>{posLabel}</div>
        </div>
      </div>
    </div>
  );
}

function TabCompare({ deals, isPro, onAnalyzeNew }: { deals: DealRun[]; isPro: boolean; onAnalyzeNew: () => void }) {
  const [mode, setMode] = useState<CompareMode>("my-deals");
  const [ai, setAi]     = useState(0);
  const [bi, setBi]     = useState(Math.min(1, deals.length - 1));

  // ── Swap handler ────────────────────────────────────────────────────────────
  const handleSwap = () => {
    const tmp = ai;
    setAi(bi);
    setBi(tmp);
  };

  const selStyle: React.CSSProperties = {
    padding: "9px 12px", borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
    color: "#E2E8F0", fontSize: 13, outline: "none",
    width: "100%", appearance: "none" as any,
  };

  // ── Free user: LIMITED 2-deal compare, my-deals only, minimal columns ───────
  // Market Comps + Closed Comps sub-tabs are locked for free users
  if (!isPro && (mode === "market" || mode === "closed")) {
    // Force back to my-deals if user tries to view locked sub-tabs
    // (Handled below — we render tab bar and show a lock on the sub-tab content)
  }

  // ── Need 2+ deals ────────────────────────────────────────────────────────────
  if (deals.length < 2) {
    return (
      <Card style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⇄</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#E2E8F0", marginBottom: 6 }}>Analyze 2+ deals to compare</div>
        <div style={{ fontSize: 13, color: "#7C8593", marginBottom: 16 }}>You need at least two saved deals to use the comparison engine.</div>
        <button onClick={() => onAnalyzeNew()} style={{ display: "inline-block", padding: "9px 18px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#3B82F6,#6366F1)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Analyze a Deal →
        </button>
      </Card>
    );
  }

  const a    = deals[ai];
  const b    = deals[bi];
  const aGap = a?.gap_pct ?? 0;
  const bGap = b?.gap_pct ?? 0;
  const aLbl = `${IL[a?.industry] || a?.industry} — ${fmt(a?.asking_price)}`;
  const bLbl = `${IL[b?.industry] || b?.industry} — ${fmt(b?.asking_price)}`;
  const aShort = IL[a?.industry] || a?.industry;
  const bShort = IL[b?.industry] || b?.industry;

  // ── Comparison logic ─────────────────────────────────────────────────────────
  // Weighted: pricing 40%, DSCR 30%, score 20%, risk 10%
  const aOpp = a ? oppScore(a) : 0;
  const bOpp = b ? oppScore(b) : 0;

  const winnerIsA = aOpp >= bOpp;
  const winnerLbl = winnerIsA ? aLbl : bLbl;
  const winnerShort = winnerIsA ? aShort : bShort;
  const tied = Math.abs(aOpp - bOpp) <= 3;

  // Category winners
  const catWinners = {
    pricing: aGap < bGap ? "A" : bGap < aGap ? "B" : "Tie",
    dscr:    (a?.dscr ?? 0) > (b?.dscr ?? 0) ? "A" : (b?.dscr ?? 0) > (a?.dscr ?? 0) ? "B" : "Tie",
    score:   (a?.overall_score ?? 0) > (b?.overall_score ?? 0) ? "A" : (b?.overall_score ?? 0) > (a?.overall_score ?? 0) ? "B" : "Tie",
    risk:    (() => {
      const r: Record<string,number> = { Low: 3, Moderate: 2, High: 1, Critical: 0 };
      const aR = r[(a?.risk_level ?? "").replace(" Risk","").trim()] ?? 1;
      const bR = r[(b?.risk_level ?? "").replace(" Risk","").trim()] ?? 1;
      return aR > bR ? "A" : bR > aR ? "B" : "Tie";
    })(),
  };

  const aWins = Object.values(catWinners).filter(v => v === "A").length;
  const bWins = Object.values(catWinners).filter(v => v === "B").length;

  // Verdict reasoning
  const verdictReason = (() => {
    if (tied) return "Both deals are closely matched on risk-adjusted metrics. The decision comes down to your preferred market and operational fit.";
    const winner = winnerIsA ? "Deal A" : "Deal B";
    const loser  = winnerIsA ? "Deal B" : "Deal A";
    const reasons: string[] = [];
    if (catWinners.pricing === (winnerIsA ? "A" : "B"))  reasons.push("stronger pricing alignment");
    if (catWinners.dscr    === (winnerIsA ? "A" : "B"))  reasons.push("higher debt coverage");
    if (catWinners.score   === (winnerIsA ? "A" : "B"))  reasons.push("better deal quality score");
    if (catWinners.risk    === (winnerIsA ? "A" : "B"))  reasons.push("lower operational risk");
    return `${reasons.slice(0,2).join(" and ")} make ${winner} the stronger opportunity at current terms.`;
  })();

  // Insight bar copy
  const insightCopy = (() => {
    if (tied) return "Neither deal is a clear standout. Prioritize diligence on customer quality, owner dependence, and add-back sustainability before advancing either.";
    const winner = winnerIsA ? "Deal A" : "Deal B";
    const loser  = winnerIsA ? "Deal B" : "Deal A";
    const loserGap = winnerIsA ? bGap : aGap;
    const loserDscr = winnerIsA ? (b?.dscr ?? 0) : (a?.dscr ?? 0);
    if (catWinners.pricing !== (winnerIsA ? "A" : "B") && catWinners.dscr === (winnerIsA ? "A" : "B")) {
      return `${winner} has stronger debt coverage but isn't the pricing leader. ${loser} has better pricing alignment — decision depends on whether stability or value matters more to your thesis.`;
    }
    if (loserGap > 15) return `${winner} has the stronger risk-adjusted position. ${loser} is priced above market median and likely needs price movement or structural improvements to compete.`;
    if (loserDscr < 1.25) return `${winner} wins on both pricing and debt coverage. ${loser}'s coverage ratio is below lender minimums — financing risk is elevated at current terms.`;
    return `${winner} holds the advantage across pricing, coverage, and quality metrics. ${loser} is a viable deal but needs to close the gap on at least one dimension to be competitive.`;
  })();

  // What would flip the verdict
  const flipCopy = (() => {
    if (tied) return "Either deal could take the lead with modest improvement. A 10–15% price reduction on either would create a clearer pricing advantage.";
    const loser      = winnerIsA ? "Deal B" : "Deal A";
    const loserGap   = winnerIsA ? bGap : aGap;
    const loserDscr  = winnerIsA ? (b?.dscr ?? 0) : (a?.dscr ?? 0);
    const loserScore = winnerIsA ? (b?.overall_score ?? 0) : (a?.overall_score ?? 0);
    if (loserGap > 20) {
      const pctNeeded = Math.round(loserGap + 5);
      return `${loser} becomes competitive if asking price drops ${pctNeeded - 10}–${pctNeeded}%. At that level, the pricing gap closes and DSCR metrics carry the comparison.`;
    }
    if (loserDscr < 1.25) return `${loser} would become viable if debt terms improve — lower interest rate, longer amortization, or higher equity injection could bring DSCR above the 1.25x minimum.`;
    if (loserGap > 0 && loserGap <= 20) return `${loser} is close. A 10–15% price reduction would bring it within range of the current leader. Alternatively, documented add-backs that improve SDE could shift the comparison.`;
    return `${loser} needs improvement in at least one of: pricing alignment, DSCR strength, or risk profile. A modest price reduction or stronger financing terms would be enough to flip this verdict.`;
  })();

  // Comparison rows
  const rows = [
    { label: "Score",      aV: String(a?.overall_score ?? "—"),                aW: catWinners.score === "A",   bV: String(b?.overall_score ?? "—"),               bW: catWinners.score === "B",   aC: scoreCol(a?.overall_score ?? 0), bC: scoreCol(b?.overall_score ?? 0) },
    { label: "Asking",     aV: fmtFull(a?.asking_price ?? 0),                  aW: false,                      bV: fmtFull(b?.asking_price ?? 0),                 bW: false,                      aC: "#E2E8F0",   bC: "#E2E8F0"   },
    { label: "Fair Value", aV: fmtFull(a?.fair_value ?? 0),                    aW: false,                      bV: fmtFull(b?.fair_value ?? 0),                   bW: false,                      aC: "#10B981",   bC: "#10B981"   },
    { label: "Gap vs Mkt", aV: (aGap > 0 ? "+" : "") + aGap + "%",            aW: catWinners.pricing === "A", bV: (bGap > 0 ? "+" : "") + bGap + "%",            bW: catWinners.pricing === "B", aC: aGap > 0 ? "#D85A30" : "#10B981", bC: bGap > 0 ? "#D85A30" : "#10B981" },
    { label: "Multiple",   aV: (a?.valuation_multiple ?? 0).toFixed(2) + "x", aW: false,                      bV: (b?.valuation_multiple ?? 0).toFixed(2) + "x", bW: false,                      aC: "#E2E8F0",   bC: "#E2E8F0"   },
    { label: "DSCR",       aV: (a?.dscr ?? 0).toFixed(2) + "x",               aW: catWinners.dscr === "A",    bV: (b?.dscr ?? 0).toFixed(2) + "x",               bW: catWinners.dscr === "B",    aC: (a?.dscr ?? 0) >= 1.25 ? "#10B981" : "#F97316", bC: (b?.dscr ?? 0) >= 1.25 ? "#10B981" : "#F97316" },
    { label: "Risk Level", aV: a?.risk_level ?? "—",                           aW: catWinners.risk === "A",    bV: b?.risk_level ?? "—",                          bW: catWinners.risk === "B",    aC: "#94A3B8",   bC: "#94A3B8"   },
    { label: "Verdict",    aV: (() => { const v = verdictCfg(a?.verdict ?? dealVerdict(a!)); return `${v.emoji} ${v.label}`; })(), aW: false, bV: (() => { const v = verdictCfg(b?.verdict ?? dealVerdict(b!)); return `${v.emoji} ${v.label}`; })(), bW: false, aC: "#E2E8F0", bC: "#E2E8F0" },
  ];

  // Free users see a limited row set — Verdict / DSCR / Multiple only
  const visibleRows = isPro
    ? rows
    : rows.filter(r => r.label === "Verdict" || r.label === "DSCR" || r.label === "Multiple");

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 18,
        background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 4,
        border: "1px solid rgba(255,255,255,0.06)", width: "fit-content",
      }}>
        {([ ["my-deals","My Deals"], ["market","Market Comps"], ["closed","Closed Comps"] ] as [CompareMode, string][]).map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: "7px 14px", borderRadius: 7, border: "none",
            background: mode === m ? "rgba(99,102,241,0.18)" : "transparent",
            color: mode === m ? "#C4B5FD" : "#7C8593",
            fontSize: 12, fontWeight: mode === m ? 600 : 400,
            cursor: "pointer", transition: "all 0.15s",
          }}>
            {label}
            {m !== "my-deals" && !isPro && <span style={{ fontSize: 9, color: "#6B7280", marginLeft: 3 }}>🔒</span>}
          </button>
        ))}
      </div>

      {/* ══ MY DEALS MODE ══════════════════════════════════════════════════════ */}
      {mode === "my-deals" && (
        <div>
          {/* Deal selectors */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "flex-end", marginBottom: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Deal A</label>
              <select value={ai} onChange={(e) => setAi(Number(e.target.value))} style={selStyle}>
                {deals.map((d, i) => (<option key={d.id} value={i}>{IL[d.industry] || d.industry} — {fmt(d.asking_price)}</option>))}
              </select>
            </div>
            <button
              onClick={handleSwap}
              title="Swap deals"
              style={{
                padding: "9px 12px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.03)",
                color: "#7C8593", fontSize: 16, cursor: "pointer",
                marginTop: 18,
              }}
            >
              ⇄
            </button>
            <div>
              <label style={{ display: "block", fontSize: 10, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Deal B</label>
              <select value={bi} onChange={(e) => setBi(Number(e.target.value))} style={selStyle}>
                {deals.map((d, i) => (<option key={d.id} value={i}>{IL[d.industry] || d.industry} — {fmt(d.asking_price)}</option>))}
              </select>
            </div>
          </div>

          {/* ── 1. COMPARISON VERDICT ────────────────────────────────────────── */}
          <div style={{
            padding: "16px 20px", borderRadius: 12, marginBottom: 14,
            background: tied
              ? "rgba(99,102,241,0.06)"
              : "linear-gradient(135deg,rgba(16,185,129,0.07),rgba(6,95,70,0.04))",
            border: tied
              ? "1px solid rgba(99,102,241,0.18)"
              : "1px solid rgba(16,185,129,0.2)",
          }}>
            <div style={{ fontSize: 10, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 }}>
              Comparison Verdict
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.01em", marginBottom: 6 }}>
              {tied ? "⚖️ Too Close to Call" : `🏆 Better Opportunity: ${winnerShort}`}
            </div>
            <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6 }}>
              {verdictReason}
            </div>
            {!tied && isPro && (
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" as any }}>
                <span style={{ fontSize: 10, color: "#9CA3AF" }}>Category wins:</span>
                <span style={{ fontSize: 10, color: "#60A5FA" }}>Deal A: {aWins}</span>
                <span style={{ fontSize: 10, color: "#9CA3AF" }}>·</span>
                <span style={{ fontSize: 10, color: "#A5B4FC" }}>Deal B: {bWins}</span>
              </div>
            )}
          </div>

          {/* ── FREE-USER GATE: Compare advanced features are Pro ── */}
          {!isPro && (
            <div style={{ marginBottom: 14, padding: "16px 18px", borderRadius: 12, background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.2)", textAlign: "center" as const }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🔒</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9", marginBottom: 6, fontFamily: "'Inter Tight',sans-serif" }}>
                Compare deals across risk, pricing, and financing
              </div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 14, lineHeight: 1.6 }}>
                Unlock category winners, benchmark overlays, detailed differences, and ranking across all your deals.
              </div>
              <button
                onClick={() => window.location.href = "/pricing"}
                style={{
                  padding: "9px 22px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
                  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Upgrade to Pro →
              </button>
            </div>
          )}

          {/* ── 2. CATEGORY WINNERS STRIP (Pro only) ─────────────────────────── */}
          {isPro && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14,
          }}>
            {([
              { label: "Pricing",  key: "pricing" as const, icon: "💰" },
              { label: "Coverage", key: "dscr"    as const, icon: "🏦" },
              { label: "Quality",  key: "score"   as const, icon: "⭐" },
              { label: "Risk",     key: "risk"    as const, icon: "🛡️" },
            ]).map(cat => {
              const winner = catWinners[cat.key];
              const isTie  = winner === "Tie";
              const winColor  = winner === "A" ? "#60A5FA" : winner === "B" ? "#A5B4FC" : "#7C8593";
              const winBg     = winner === "A" ? "rgba(59,130,246,0.08)" : winner === "B" ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.03)";
              const winBorder = winner === "A" ? "rgba(59,130,246,0.2)"  : winner === "B" ? "rgba(99,102,241,0.2)"  : "rgba(255,255,255,0.06)";
              return (
                <div key={cat.key} style={{
                  padding: "10px 12px", borderRadius: 10,
                  background: winBg, border: `1px solid ${winBorder}`,
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 14, marginBottom: 4 }}>{cat.icon}</div>
                  <div style={{ fontSize: 10, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{cat.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: winColor }}>
                    {isTie ? "Tie" : `Deal ${winner}`}
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {/* ── 3. SIDE-BY-SIDE METRICS ──────────────────────────────────────── */}
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr", gap: "0 12px" }}>
              {/* Column headers */}
              <div />
              <div style={{
                padding: "8px 12px", borderRadius: "8px 8px 0 0",
                background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", borderBottom: "none",
                fontSize: 12, fontWeight: 600, color: "#60A5FA", textAlign: "center",
              }}>
                {aShort}
              </div>
              <div style={{
                padding: "8px 12px", borderRadius: "8px 8px 0 0",
                background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)", borderBottom: "none",
                fontSize: 12, fontWeight: 600, color: "#A5B4FC", textAlign: "center",
              }}>
                {bShort}
              </div>

              {/* Data rows */}
              {visibleRows.map((row, i) => (
                <React.Fragment key={row.label}>
                  <div style={{
                    padding: "10px 0", fontSize: 11, color: "#7C8593",
                    display: "flex", alignItems: "center",
                    borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}>
                    {row.label}
                  </div>
                  <div style={{
                    padding: "10px 12px", fontSize: 13, fontWeight: 600, color: row.aC,
                    textAlign: "center", fontFamily: "'JetBrains Mono',monospace",
                    background: row.aW ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.03)",
                    border: "1px solid rgba(59,130,246,0.08)",
                    borderTop: "none",
                    borderBottom: i < rows.length - 1 ? "none" : "1px solid rgba(59,130,246,0.08)",
                    position: "relative",
                  }}>
                    {row.aV}
                    {row.aW && (
                      <span style={{ position: "absolute", top: 4, right: 4, fontSize: 8, color: "#60A5FA", fontWeight: 700 }}>✓</span>
                    )}
                  </div>
                  <div style={{
                    padding: "10px 12px", fontSize: 13, fontWeight: 600, color: row.bC,
                    textAlign: "center", fontFamily: "'JetBrains Mono',monospace",
                    background: row.bW ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.03)",
                    border: "1px solid rgba(99,102,241,0.08)",
                    borderTop: "none",
                    borderBottom: i < rows.length - 1 ? "none" : "1px solid rgba(99,102,241,0.08)",
                    position: "relative",
                  }}>
                    {row.bV}
                    {row.bW && (
                      <span style={{ position: "absolute", top: 4, right: 4, fontSize: 8, color: "#A5B4FC", fontWeight: 700 }}>✓</span>
                    )}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </Card>

          {/* ── 4. INSIGHT BAR (Pro only) ────────────────────────────────────── */}
          {isPro && (
          <div style={{
            padding: "14px 18px", borderRadius: 10, marginBottom: 14,
            background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.14)",
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>💡</span>
            <span style={{ fontSize: 13, color: "#FBBF24", lineHeight: 1.7 }}>{insightCopy}</span>
          </div>
          )}

          {/* ── 5. WHAT WOULD FLIP THE VERDICT (Pro only) ────────────────────── */}
          {isPro && (
          <div style={{
            padding: "14px 18px", borderRadius: 10,
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              What would change the verdict?
            </div>
            <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7 }}>
              {flipCopy}
            </div>
          </div>
          )}
        </div>
      )}

      {/* ══ MARKET COMPS MODE ════════════════════════════════════════════════ */}
      {mode === "market" && !isPro && (
        <div style={{ padding: "32px 24px", borderRadius: 12, background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.2)", textAlign: "center" as const }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🔒</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9", marginBottom: 6, fontFamily: "'Inter Tight',sans-serif" }}>
            Market Comps is a Pro feature
          </div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 14, lineHeight: 1.6 }}>
            See active market positioning, benchmark overlays, and pricing percentiles for every deal you're evaluating.
          </div>
          <button onClick={() => window.location.href = "/pricing"} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Upgrade to Pro →
          </button>
        </div>
      )}

      {mode === "market" && isPro && (
        <div style={{ animation: "fadeUp 0.2s ease-out" }}>
          {isPro ? (
            // ── PRO: Live Market Comps ────────────────────────────────────────
            (() => {
              const mult     = a?.valuation_multiple ?? 0;
              const ind      = SCORE_INDUSTRIES[a?.industry ?? ""];
              const mktLow   = ind?.benchmarkLow    ?? 2.1;
              const mktMed   = ind?.benchmarkMid    ?? 3.1;
              const mktHigh  = ind?.benchmarkHigh   ?? 4.0;
              const isAbove  = mult > mktMed;

              const implication = mult > mktHigh * 1.3
                ? "Current ask is stretched well above where sellers are successfully marketing this type of business. Expect strong resistance from buyers comparing active listings."
                : mult > mktHigh
                ? "Your deal is priced above most current market asks. This pricing may face resistance from buyers who can compare active listings."
                : mult > mktMed
                ? "Deal A sits above the median active-listing multiple. Negotiation room likely exists — sellers in this range typically close below ask."
                : mult < mktLow * 0.8
                ? "Current pricing is below what most sellers are asking. Investigate whether the discount is structural or an opportunity."
                : "Current pricing appears broadly aligned with the live market. Focus negotiation on terms and structure rather than price alone.";

              return (
                <div>
                  {/* Header */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter Tight',sans-serif", marginBottom: 4 }}>
                      Market Comps — Active Listings
                    </div>
                    <div style={{ fontSize: 11, color: "#7C8593", lineHeight: 1.5 }}>
                      Active listings show where sellers are testing the market. Useful for negotiation framing — not final transaction truth.
                    </div>
                  </div>

                  {/* Hero: Range track */}
                  <div style={{ padding: "16px 20px", borderRadius: 12, marginBottom: 14, background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.18)" }}>
                    <div style={{ fontSize: 10, color: "#60A5FA", textTransform: "uppercase" as const, letterSpacing: "0.09em", fontWeight: 700, marginBottom: 14 }}>
                      Pricing Position vs Live Market
                    </div>
                    <CompareRangeTrack
                      currentValue={mult}
                      low={mktLow} median={mktMed} high={mktHigh}
                      label="Deal A"
                      accentColor={mult <= mktMed ? "#60A5FA" : mult <= mktHigh ? "#F59E0B" : "#EF4444"}
                      emptyText="Benchmark range unavailable for this industry"
                    />
                  </div>

                  {/* KPI cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
                    {[
                      { label: "Your Multiple",      value: `${mult.toFixed(2)}x`,           color: "#60A5FA" },
                      { label: "Market Median",       value: `${mktMed.toFixed(2)}x`,          color: "#E2E8F0" },
                      { label: "Market Range",        value: `${mktLow.toFixed(2)}x–${mktHigh.toFixed(2)}x`, color: "#94A3B8" },
                      { label: "Position",            value: mult < mktLow ? "Below Range" : mult > mktHigh ? "Above Range" : mult <= mktMed ? "Below Median" : "Above Median", color: mult > mktHigh ? "#EF4444" : mult < mktLow ? "#2DD4BF" : "#60A5FA" },
                      { label: "Gap vs Median",       value: `${mult > mktMed ? "+" : ""}${((mult - mktMed) / mktMed * 100).toFixed(0)}%`, color: mult > mktMed ? "#F97316" : "#10B981" },
                      { label: "Market Positioning",   value: mult > mktHigh ? "Above Range" : mult < mktLow ? "Below Range" : mult > mktMed ? "Above Median" : "Below Median", color: mult > mktHigh ? "#EF4444" : mult < mktLow ? "#2DD4BF" : mult > mktMed ? "#F59E0B" : "#10B981" },
                    ].map(m => (
                      <div key={m.label} style={{ padding: "10px 12px", borderRadius: 9, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 5 }}>{m.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono',monospace" }}>{m.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Implication */}
                  <div style={{ padding: "12px 16px", borderRadius: 10, background: isAbove ? "rgba(249,115,22,0.05)" : "rgba(59,130,246,0.05)", border: `1px solid ${isAbove ? "rgba(249,115,22,0.18)" : "rgba(59,130,246,0.15)"}` }}>
                    <div style={{ fontSize: 10, color: "#7C8593", textTransform: "uppercase" as const, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>Pricing Takeaway</div>
                    <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7 }}>{implication}</div>
                  </div>
                </div>
              );
            })()
          ) : (
            // ── LOCKED: Market Comps ────────────────────────────────────────────
            <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(99,102,241,0.2)" }}>
              <div style={{ padding: "24px 28px", background: "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(59,130,246,0.04))" }}>
                <div style={{ fontSize: 10, color: "#818CF8", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 10 }}>⚡ Pro Feature</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter Tight',sans-serif", marginBottom: 8 }}>Compare Against Live Market Listings</div>
                <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7, marginBottom: 20, maxWidth: 480 }}>
                  See how your deal stacks up against current asking multiples, live market pricing, and active listing trends in the same industry.
                </div>
                {/* Blurred preview metrics */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 20, filter: "blur(4px)", userSelect: "none" as any, pointerEvents: "none" }}>
                  {[
                    { label: "Median Ask Multiple", value: "3.2x"  },
                    { label: "Active Listings",      value: "41"    },
                    { label: "Market Positioning",    value: "68th"  },
                    { label: "Market Spread",        value: "2.4x–4.1x" },
                  ].map(m => (
                    <div key={m.label} style={{ padding: "12px", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase", marginBottom: 4 }}>{m.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#818CF8" }}>{m.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "#7C8593", marginBottom: 20, lineHeight: 1.6 }}>
                  This shows whether a deal is cheap, fair, or aggressive relative to what is currently being marketed — essential context before going to LOI.
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button style={{ padding: "10px 22px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Upgrade to Pro
                  </button>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>Unlock live market comparisons across active listings.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ CLOSED COMPS MODE ════════════════════════════════════════════════ */}
      {mode === "closed" && !isPro && (
        <div style={{ padding: "32px 24px", borderRadius: 12, background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.2)", textAlign: "center" as const }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🔒</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9", marginBottom: 6, fontFamily: "'Inter Tight',sans-serif" }}>
            Closed Comps is a Pro feature
          </div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 14, lineHeight: 1.6 }}>
            See where similar deals have actually closed. The strongest anchor for your LOI.
          </div>
          <button onClick={() => window.location.href = "/pricing"} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Upgrade to Pro →
          </button>
        </div>
      )}

      {mode === "closed" && isPro && (
        <div style={{ animation: "fadeUp 0.2s ease-out" }}>
          {isPro ? (
            // ── PRO: Closed Comps ──────────────────────────────────────────────
            (() => {
              const mult     = a?.valuation_multiple ?? 0;
              const ind      = SCORE_INDUSTRIES[a?.industry ?? ""];
              // Closed deal ranges trend ~15–20% below asking multiples
              const clLow    = ind ? ind.benchmarkLow  * 0.82 : 1.7;
              const clMed    = ind ? ind.benchmarkMid  * 0.84 : 2.3;
              const clHigh   = ind ? ind.benchmarkHigh * 0.86 : 2.9;
              const isAbove  = mult > clHigh;
              const isBelow  = mult < clLow;
              const pctVsMed = ((mult - clMed) / clMed * 100).toFixed(0);

              const implication = mult > clHigh * 1.4
                ? `This deal is priced well above where similar businesses have actually closed. Closed transaction data suggests meaningful repricing may be required before a buyer will commit.`
                : mult > clHigh
                ? `Your deal is priced above where similar deals have actually closed. Expect negotiation pressure — buyers using closed comps will anchor below the current ask.`
                : mult > clMed
                ? `Current pricing is above the median closing multiple for this industry. Workable, but expect buyers to push for a discount at LOI.`
                : mult < clLow
                ? `Current pricing is below the typical closed range — if earnings are credible, this is a strong entry point supported by historical transaction data.`
                : `This deal sits within historical closing norms. Pricing is defensible at LOI based on closed transaction benchmarks.`;

              return (
                <div>
                  {/* Header */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter Tight',sans-serif", marginBottom: 4 }}>
                      Closed Comps — Historical Transactions
                    </div>
                    <div style={{ fontSize: 11, color: "#7C8593", lineHeight: 1.5 }}>
                      Closed comps show where buyers and sellers actually transacted. This is the strongest pricing anchor for your LOI.
                    </div>
                  </div>

                  {/* Hero: Range track — green accent, feels more decisive */}
                  <div style={{ padding: "16px 20px", borderRadius: 12, marginBottom: 14, background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.2)" }}>
                    <div style={{ fontSize: 10, color: "#10B981", textTransform: "uppercase" as const, letterSpacing: "0.09em", fontWeight: 700, marginBottom: 14 }}>
                      Pricing Position vs Closed Transactions
                    </div>
                    <CompareRangeTrack
                      currentValue={mult}
                      low={clLow} median={clMed} high={clHigh}
                      label="Deal A"
                      accentColor={isBelow ? "#2DD4BF" : isAbove ? "#EF4444" : "#10B981"}
                      emptyText="Closed comp range unavailable for this industry"
                    />
                  </div>

                  {/* KPI cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
                    {[
                      { label: "Your Multiple",      value: `${mult.toFixed(2)}x`,                 color: "#60A5FA"  },
                      { label: "Closed Median",       value: `${clMed.toFixed(2)}x`,                color: "#10B981"  },
                      { label: "Closed Range",        value: `${clLow.toFixed(2)}x–${clHigh.toFixed(2)}x`, color: "#94A3B8" },
                      { label: "Position",            value: isBelow ? "Below Range" : isAbove ? "Above Range" : "Within Range", color: isAbove ? "#EF4444" : isBelow ? "#2DD4BF" : "#10B981" },
                      { label: "vs Closed Median",    value: `${Number(pctVsMed) > 0 ? "+" : ""}${pctVsMed}%`, color: Number(pctVsMed) > 15 ? "#F97316" : Number(pctVsMed) < -5 ? "#10B981" : "#94A3B8" },
                      { label: "Sold vs Ask (est.)",  value: "−14% avg",  color: "#F59E0B"  },
                    ].map(m => (
                      <div key={m.label} style={{ padding: "10px 12px", borderRadius: 9, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 5 }}>{m.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono',monospace" }}>{m.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Implication — stronger, more decisive than Market Comps */}
                  <div style={{ padding: "12px 16px", borderRadius: 10, background: isAbove ? "rgba(239,68,68,0.05)" : "rgba(16,185,129,0.05)", border: `1px solid ${isAbove ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}` }}>
                    <div style={{ fontSize: 10, color: "#7C8593", textTransform: "uppercase" as const, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>LOI Anchor Signal</div>
                    <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7 }}>{implication}</div>
                  </div>
                </div>
              );
            })()
          ) : (
            // ── LOCKED: Closed Comps ────────────────────────────────────────────
            <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(99,102,241,0.2)" }}>
              <div style={{ padding: "24px 28px", background: "linear-gradient(135deg,rgba(16,185,129,0.06),rgba(6,95,70,0.03))" }}>
                <div style={{ fontSize: 10, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 10 }}>⚡ Pro Feature</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter Tight',sans-serif", marginBottom: 8 }}>Benchmark Against Actual Closed Deals</div>
                <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7, marginBottom: 20, maxWidth: 480 }}>
                  Compare your deal to historical transaction multiples, sold pricing ranges, and real closed-deal benchmarks from the DealStats database.
                </div>
                {/* Blurred preview */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 20, filter: "blur(4px)", userSelect: "none" as any, pointerEvents: "none" }}>
                  {[
                    { label: "Median Closed Multiple", value: "2.6x"       },
                    { label: "Sold vs Ask",             value: "−14%"       },
                    { label: "Closed Comp Count",       value: "126"        },
                    { label: "Closed Range",            value: "1.9x–3.4x"  },
                  ].map(m => (
                    <div key={m.label} style={{ padding: "12px", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase", marginBottom: 4 }}>{m.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#10B981" }}>{m.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "#7C8593", marginBottom: 20, lineHeight: 1.6 }}>
                  This shows where deals actually close — not just where sellers hope to sell. The strongest signal for anchoring your offer.
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button style={{ padding: "10px 22px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Upgrade to Pro
                  </button>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>Unlock historical closed-deal benchmarking.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
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

  // Free plan: soft limit of 3 market checks. Counter persists across sessions.
  const FREE_MARKET_CHECK_LIMIT = 3;
  const [freeChecksUsed, setFreeChecksUsed] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("nxtax_free_market_checks") ?? "0", 10);
  });
  const freeChecksRemaining = Math.max(0, FREE_MARKET_CHECK_LIMIT - freeChecksUsed);
  const freeLimitReached    = !isPro && freeChecksRemaining === 0;

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
    // Free soft limit: block run if already used allotted checks
    if (!isPro && freeChecksRemaining === 0) {
      setError(`You've used all ${FREE_MARKET_CHECK_LIMIT} free market analyses. Upgrade to Pro for unlimited checks.`);
      return;
    }
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
    if (score >= 80) return "Saturated";
    if (score >= 60) return "Competitive";
    if (score >= 30) return "Balanced";
    return "Underserved";
  }

  /** Short interpretation under the saturation score */
  function satInterpretation(score: number, total: number): string {
    if (total === 0) return "No competitors found. Try a larger radius or verify the address resolves to a populated area.";
    if (score >= 80) return "Heavily contested. Established players dominate — new entry requires significant differentiation or an acquisition strategy.";
    if (score >= 60) return "Competitive market with multiple active operators. Niche positioning and execution quality are the deciding factors.";
    if (score >= 30) return "Moderate competition with room for disciplined operators. Market can support a well-run entrant.";
    return "Underserved market with minimal organized competition. Strong first-mover window for a capitalized operator.";
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
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <h2 style={{
              fontSize: 15, fontWeight: 700, margin: "0 0 3px",
              fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.02em", color: "#F1F5F9",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              Local Market Saturation Analysis
              <span style={{
                fontSize: 10, fontWeight: 600, color: "#10B981",
                background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)",
                padding: "2px 8px", borderRadius: 20, letterSpacing: "0.06em", textTransform: "uppercase" as any,
              }}>Core Feature</span>
            </h2>
            <p style={{ fontSize: 11, color: "#7C8593", margin: 0 }}>
              Local competitive density for your selected deal — answer "is this market worth entering?"
            </p>
          </div>
          <ProBadge />
        </div>
      </div>

      {/* Free-user soft-limit counter — shown above the working card */}
      {!isPro && (
        <div style={{
          marginBottom: 12, padding: "10px 14px", borderRadius: 10,
          background: freeChecksRemaining > 0 ? "rgba(99,102,241,0.05)" : "rgba(245,158,11,0.08)",
          border: freeChecksRemaining > 0 ? "1px solid rgba(99,102,241,0.18)" : "1px solid rgba(245,158,11,0.3)",
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: freeChecksRemaining > 0 ? "#A5B4FC" : "#F59E0B" }}>
            {freeChecksRemaining > 0
              ? `You've used ${freeChecksUsed} of ${FREE_MARKET_CHECK_LIMIT} free market analyses`
              : `You've used all ${FREE_MARKET_CHECK_LIMIT} free market analyses`}
          </span>
          <div style={{ flex: 1, minWidth: 100, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${(freeChecksUsed / FREE_MARKET_CHECK_LIMIT) * 100}%`,
              background: freeChecksRemaining > 0 ? "#818CF8" : "#F59E0B",
              transition: "width 0.3s ease",
            }} />
          </div>
          <button
            onClick={() => window.location.href = "/pricing"}
            style={{
              padding: "5px 12px", borderRadius: 6, border: "none",
              background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
              color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const,
            }}
          >
            Upgrade for Unlimited
          </button>
        </div>
      )}

      {/* Working card — free users see the same UI, bounded by the soft limit */}
        <Card style={{
          border: "1px solid rgba(16,185,129,0.3)",
          boxShadow: "0 0 24px rgba(16,185,129,0.08), 0 0 48px rgba(16,185,129,0.04), 0 4px 24px rgba(16,185,129,0.06)",
        }}>
          {/* Controls */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "flex-end", marginBottom: 16 }}>
            {/* Deal selector */}
            <div>
              <div style={{ fontSize: 10, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>
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
                <div style={{ fontSize: 10, color: "#6B7280", marginTop: 4 }}>
                  {deals.filter(d => !d.city && !d.state).length} deal(s) hidden — no location data
                </div>
              )}
            </div>

            {/* Radius selector */}
            <div>
              <div style={{ fontSize: 10, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>
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
                      color: radius === r ? "#C4B5FD" : "#7C8593",
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
                color: selectedDealId && !loading ? "#fff" : "#6B7280",
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
              <div style={{ fontSize: 10, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>
                MarketView Category
                <span style={{ marginLeft: 6, fontSize: 9, color: "#6B7280", fontWeight: 400, textTransform: "none" as any }}>
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
              <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
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
                  <div style={{ fontSize: 10, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
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
                    {satLabel(result.saturationScore)}
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
                        <div style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{m.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#E2E8F0", fontFamily: "'JetBrains Mono',monospace" }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Saturation interpretation */}
              <div style={{ padding: "8px 12px", borderRadius: 8, marginBottom: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>
                {satInterpretation(result.saturationScore, result.totalCompetitors)}
              </div>

              {/* Competitor breakdown */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>
                  Competitive Mix
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
                      <div style={{ fontSize: 10, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.06em" }}>
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
                  <span style={{ fontSize: 10, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
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
                      <span style={{ fontSize: 10, color: "#7C8593" }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Structured insight blocks — parsed from AI output */}
              {aiInsight && (() => {
                // Parse AI paragraphs into 4 structured blocks
                const clean  = aiInsight.replace(/\*\*/g, "").trim();
                const paras  = clean.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

                // Extract Recommendation line (starts with "Recommendation:")
                const recIdx  = paras.findIndex(p => /^recommendation[:\s]/i.test(p));
                const recPara = recIdx !== -1 ? paras[recIdx].replace(/^recommendation[:\s]*/i, "").trim() : null;
                const bodyParas = paras.filter((_, i) => i !== recIdx).slice(0, 3);

                // Assign blocks: Competitive Position, Opportunity Angle, Risk
                const blockDefs = [
                  { icon: "🏁", label: "Competitive Position", color: "#60A5FA" },
                  { icon: "💡", label: "Opportunity Angle",    color: "#10B981" },
                  { icon: "⚠️", label: "Risk",                 color: "#F59E0B" },
                ];

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 10, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 2 }}>
                      Market Intelligence
                    </div>
                    {blockDefs.map((def, i) => {
                      const text = bodyParas[i];
                      if (!text) return null;
                      return (
                        <div key={def.label} style={{
                          padding: "10px 13px", borderRadius: 9,
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: def.color, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
                            {def.icon} {def.label}
                          </div>
                          <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>{text}</div>
                        </div>
                      );
                    })}
                    {recPara && (
                      <div style={{
                        padding: "10px 13px", borderRadius: 9,
                        background: "rgba(16,185,129,0.05)",
                        border: "1px solid rgba(16,185,129,0.15)",
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
                          🎯 Recommendation
                        </div>
                        <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>{recPara}</div>
                      </div>
                    )}
                  </div>
                );
              })()}

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
            <div style={{ textAlign: "center", padding: "24px 0", color: "#6B7280", fontSize: 13 }}>
              Select a deal above and choose a radius to run a local market saturation check.
            </div>
          )}
        </Card>
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
  // ── Derived metrics ──────────────────────────────────────────────────────
  const overpricedListFull = [...dri].sort((a, b) => (b.gap_pct ?? 0) - (a.gap_pct ?? 0)).slice(0, 6);
  const overpricedList     = isPro ? overpricedListFull : overpricedListFull.slice(0, 2);
  const opportunityListFull = [...dri]
    .filter(s => condSig(s.condition) === "opportunity")
    .sort((a, b) => (a.gap_pct ?? 0) - (b.gap_pct ?? 0))
    .slice(0, 6);
  const opportunityList     = isPro ? opportunityListFull : opportunityListFull.slice(0, 2);

  const avgDri = dri.length
    ? (dri.reduce((a, s) => a + (s.dri ?? 0), 0) / dri.length)
    : null;

  const overpricedCount = dri.filter(s => condSig(s.condition) === "overpriced").length;
  const overpricedPct   = dri.length ? Math.round((overpricedCount / dri.length) * 100) : null;

  const medianGap = dri.length
    ? (() => {
        const sorted = [...dri].map(s => s.gap_pct ?? 0).sort((a, b) => a - b);
        const mid    = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0
          ? sorted[mid]
          : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
      })()
    : null;

  // Market condition label from DRI
  const marketConditionLabel = avgDri === null ? "—"
    : avgDri < 0.95 ? "Buyer-Favorable"
    : avgDri < 1.05 ? "Balanced"
    : avgDri < 1.20 ? "Slightly Seller-Favored"
    : "Seller-Favored";

  const marketConditionColor = avgDri === null ? "#7C8593"
    : avgDri < 0.95 ? "#10B981"
    : avgDri < 1.05 ? "#F59E0B"
    : "#D85A30";

  const marketInterpretation = avgDri === null ? ""
    : avgDri < 0.95
      ? "Most industries are pricing below market median — favorable conditions for disciplined buyers."
    : avgDri < 1.05
      ? "Pricing is broadly balanced. Deal quality and structure matter more than timing right now."
    : avgDri < 1.20
      ? "Buyers are paying above market in most sectors — pricing discipline and negotiation are critical."
    : "Heavy seller favoritism across the market. Expect resistance on price and limited motivated sellers.";

  return (
    <div>

      {/* ══ SECTION 1: MARKET CONDITIONS ══════════════════════════════════════ */}
      <div style={{ marginBottom: 24 }}>
        <SectionHeader
          title="Current Market Conditions"
          sub="Live signals across all tracked industries"
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
          {/* Market Heat */}
          <div style={{
            padding: "16px 18px", borderRadius: 12,
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 10, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 }}>
              Market Heat (DRI)
            </div>
            {loading ? <Skel h={22} w={60} /> : (
              <div style={{ fontSize: 26, fontWeight: 700, color: marketConditionColor, fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.02em", marginBottom: 4 }}>
                {avgDri !== null ? avgDri.toFixed(2) : "—"}
              </div>
            )}
            <div style={{ fontSize: 11, color: marketConditionColor, fontWeight: 600 }}>{marketConditionLabel}</div>
          </div>

          {/* % Overpriced */}
          <div style={{
            padding: "16px 18px", borderRadius: 12,
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 10, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 }}>
              Overpriced Industries
            </div>
            {loading ? <Skel h={22} w={60} /> : (
              <div style={{ fontSize: 26, fontWeight: 700, color: "#D85A30", fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.02em", marginBottom: 4 }}>
                {overpricedPct !== null ? `${overpricedPct}%` : "—"}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#6B7280" }}>of tracked industries</div>
          </div>

          {/* Median pricing gap */}
          <div style={{
            padding: "16px 18px", borderRadius: 12,
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 10, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 }}>
              Median Pricing Gap
            </div>
            {loading ? <Skel h={22} w={60} /> : (
              <div style={{
                fontSize: 26, fontWeight: 700,
                color: medianGap !== null && medianGap > 0 ? "#D85A30" : "#10B981",
                fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.02em", marginBottom: 4,
              }}>
                {medianGap !== null ? `${medianGap > 0 ? "+" : ""}${medianGap}%` : "—"}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#6B7280" }}>vs market median</div>
          </div>
        </div>

        {/* Market interpretation line */}
        {!loading && marketInterpretation && (
          <div style={{
            padding: "10px 14px", borderRadius: 9,
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            fontSize: 13, color: "#94A3B8", lineHeight: 1.5,
          }}>
            {marketInterpretation}
          </div>
        )}
      </div>

      {/* ══ SECTION 2: WHERE THE MARKET IS MISPRICED ══════════════════════════ */}
      {/* Free users see top 2 overpriced + top 2 opportunity; rest gated inline */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

        {/* Most Overpriced */}
        <div>
          <SectionHeader
            title="Most Overpriced"
            sub="Buyers consistently paying above market — negotiate aggressively"
          />
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr auto",
              padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(255,255,255,0.01)",
            }}>
              {["Industry", "Gap vs Market"].map(h => (
                <div key={h} style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{h}</div>
              ))}
            </div>
            {loading ? (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {[0,1,2,3].map(i => <Skel key={i} h={32} />)}
              </div>
            ) : overpricedList.map((s, i) => (
              <div
                key={s.industry_key}
                style={{
                  display: "grid", gridTemplateColumns: "1fr auto",
                  padding: "10px 16px",
                  borderBottom: i < overpricedList.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: "#E2E8F0", fontWeight: 500 }}>
                    {IL[s.industry_key] || s.industry_key}
                  </div>
                  <div style={{ fontSize: 10, color: "#D85A30", marginTop: 1 }}>
                    +{(s.gap_pct ?? 0).toFixed(0)}% above median (buyers overpaying)
                  </div>
                </div>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  padding: "2px 8px", borderRadius: 6,
                  fontSize: 10, fontWeight: 700,
                  background: "rgba(216,90,48,0.1)", color: "#D85A30", border: "1px solid rgba(216,90,48,0.2)",
                }}>
                  Overpriced
                </span>
              </div>
            ))}
            {!isPro && overpricedListFull.length > overpricedList.length && (
              <div style={{
                padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.05)",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                background: "rgba(99,102,241,0.03)",
              }}>
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                  +{overpricedListFull.length - overpricedList.length} more industries hidden
                </span>
                <button
                  onClick={() => window.location.href = "/pricing"}
                  style={{
                    padding: "4px 10px", borderRadius: 6, border: "none",
                    background: "rgba(99,102,241,0.12)", color: "#A5B4FC",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  See all →
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* Best Opportunities */}
        <div>
          <SectionHeader
            title="Best Opportunities"
            sub="Industries priced below market median — favorable entry points"
          />
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr auto",
              padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(255,255,255,0.01)",
            }}>
              {["Industry", "Gap vs Market"].map(h => (
                <div key={h} style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{h}</div>
              ))}
            </div>
            {loading ? (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {[0,1,2,3].map(i => <Skel key={i} h={32} />)}
              </div>
            ) : opportunityList.length === 0 ? (
              <div style={{ padding: "20px 16px", fontSize: 12, color: "#6B7280", textAlign: "center" }}>
                No industries currently priced below market median.
              </div>
            ) : opportunityList.map((s, i) => (
              <div
                key={s.industry_key}
                style={{
                  display: "grid", gridTemplateColumns: "1fr auto",
                  padding: "10px 16px",
                  borderBottom: i < opportunityList.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: "#E2E8F0", fontWeight: 500 }}>
                    {IL[s.industry_key] || s.industry_key}
                  </div>
                  <div style={{ fontSize: 10, color: "#10B981", marginTop: 1 }}>
                    {(s.gap_pct ?? 0).toFixed(0)}% below median (favorable pricing)
                  </div>
                </div>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  padding: "2px 8px", borderRadius: 6,
                  fontSize: 10, fontWeight: 700,
                  background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)",
                }}>
                  Opportunity
                </span>
              </div>
            ))}
            {!isPro && opportunityListFull.length > opportunityList.length && (
              <div style={{
                padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.05)",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                background: "rgba(99,102,241,0.03)",
              }}>
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                  +{opportunityListFull.length - opportunityList.length} more industries hidden
                </span>
                <button
                  onClick={() => window.location.href = "/pricing"}
                  style={{
                    padding: "4px 10px", borderRadius: 6, border: "none",
                    background: "rgba(99,102,241,0.12)", color: "#A5B4FC",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  See all →
                </button>
              </div>
            )}
            {opportunityList.length > 0 && (
              <div style={{
                padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.04)",
                fontSize: 11, color: "#10B981",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <span>↓</span>
                <span>Run a Local Market Saturation check below to validate entry conditions in these industries</span>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ══ SECTION 2.5: TRENDING VALUATION MULTIPLES ═══════════════════════════
           Side-by-side SDE + Revenue multiples with transaction sample sizes.
           Free users see top 3; Pro sees full list. IQR bar visible on hover.      */}
      <div style={{ marginBottom: 24 }}>
        <SectionHeader
          title="Trending Valuation Multiples"
          sub="Live closed-deal multiples from the DealStats transaction database"
        />
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {/* Header row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) auto",
            gap: 12,
            padding: "9px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(255,255,255,0.01)",
            alignItems: "center",
          }}>
            <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Industry</div>
            <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, textAlign: "right" as const }}>SDE Multiple</div>
            <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, textAlign: "right" as const }}>Revenue Multiple</div>
            <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, textAlign: "right" as const, minWidth: 52 }}>Deals</div>
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {[0,1,2].map(i => <Skel key={i} h={36} />)}
            </div>
          ) : trending.length === 0 ? (
            <div style={{ padding: "20px 16px", fontSize: 12, color: "#6B7280", textAlign: "center" as const }}>
              Loading transaction data…
            </div>
          ) : (
            <>
              {(isPro ? trending : trending.slice(0, 3)).map((t, i, arr) => (
                <div
                  key={t.industry_key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) auto",
                    gap: 12,
                    padding: "10px 16px",
                    borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#E2E8F0", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                    {IL[t.industry_key] || t.industry_key}
                  </div>
                  {/* SDE multiple with IQR range as sub */}
                  <div style={{ textAlign: "right" as const }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#A5B4FC", fontFamily: "'JetBrains Mono',monospace" }}>
                      {Number(t.median_multiple ?? 0).toFixed(2)}x
                    </div>
                    {t.p25_sde_multiple != null && t.p75_sde_multiple != null && (
                      <div style={{ fontSize: 10, color: "#6B7280", fontFamily: "'JetBrains Mono',monospace", marginTop: 1 }}>
                        {Number(t.p25_sde_multiple).toFixed(1)}–{Number(t.p75_sde_multiple).toFixed(1)}x
                      </div>
                    )}
                  </div>
                  {/* Revenue multiple */}
                  <div style={{ textAlign: "right" as const }}>
                    {t.revenue_multiple != null ? (
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#7DD3FC", fontFamily: "'JetBrains Mono',monospace" }}>
                        {Number(t.revenue_multiple).toFixed(2)}x
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: "#6B7280" }}>—</div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "right" as const, fontFamily: "'JetBrains Mono',monospace", minWidth: 52 }}>
                    n={t.sample_size}
                  </div>
                </div>
              ))}
              {/* Show-more link for free users */}
              {!isPro && trending.length > 3 && (
                <div style={{
                  padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                  background: "rgba(99,102,241,0.03)",
                }}>
                  <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                    +{trending.length - 3} more industries hidden
                  </span>
                  <button
                    onClick={() => window.location.href = "/pricing"}
                    style={{
                      padding: "4px 10px", borderRadius: 6, border: "none",
                      background: "rgba(99,102,241,0.12)", color: "#A5B4FC",
                      fontSize: 11, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    See all →
                  </button>
                </div>
              )}
              {/* Legend footer */}
              <div style={{
                padding: "9px 16px", borderTop: "1px solid rgba(255,255,255,0.04)",
                fontSize: 10, color: "#7C8593", lineHeight: 1.5,
              }}>
                <span style={{ color: "#A5B4FC", fontWeight: 600 }}>SDE Multiple</span> — primary valuation metric ·{" "}
                <span style={{ color: "#7DD3FC", fontWeight: 600 }}>Revenue Multiple</span> — cross-reference ·{" "}
                Range shows 25th–75th percentile band · Mid-size deals only
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ══ SECTION 3: LOCAL MARKET SATURATION (always available w/ soft limit) ═ */}
      <div style={{ marginBottom: 24 }}>
        <LocalMarketRealityCheck deals={deals} isPro={isPro} />
      </div>

      {/* ══ SECTION 4: PERSONALIZED DEAL FEED (has internal Pro/Free branches) ═ */}
      <div style={{ marginBottom: 8 }}>
        {isPro ? (
          // ── Pro: real feed ─────────────────────────────────────────────────
          <div>
            <SectionHeader
              title="Deals Worth Reviewing"
              sub="Surfaced based on your saved deal history and live market signals"
              action={<ProBadge />}
            />
            {deals.length === 0 ? (
              <Card>
                <div style={{ fontSize: 13, color: "#7C8593", textAlign: "center", padding: "16px 0" }}>
                  Save your first deal to start receiving personalized recommendations.
                </div>
              </Card>
            ) : (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                {deals
                  .filter(d => (d.verdict ?? dealVerdict(d)) !== "pass")
                  .sort((a, b) => oppScore(b) - oppScore(a))
                  .slice(0, 5)
                  .map((deal, i, arr) => {
                    const vd  = verdictCfg(deal.verdict ?? dealVerdict(deal));
                    const gp  = deal.gap_pct ?? 0;
                    const why = (() => {
                      if ((deal.verdict ?? dealVerdict(deal)) === "high_conviction") return "Rare pricing disconnect with strong debt coverage";
                      if (gp < -20) return "Priced significantly below market median";
                      if (deal.dscr >= 2.0 && gp < 0) return "Strong DSCR + favorable pricing alignment";
                      if (deal.overall_score >= 80) return "High deal quality score across all dimensions";
                      return "Balanced opportunity — pricing, coverage, and quality aligned";
                    })();
                    return (
                      <div key={deal.id} style={{
                        display: "flex", alignItems: "center", gap: 14, padding: "12px 18px",
                        borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                      }}>
                        <Ring score={deal.overall_score} size={36} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", marginBottom: 2 }}>
                            {IL[deal.industry] || deal.industry}
                            {(deal.city || deal.state) && (
                              <span style={{ fontSize: 11, color: "#7C8593", fontWeight: 400, marginLeft: 6 }}>
                                · {[deal.city, deal.state].filter(Boolean).join(", ")}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: "#7C8593" }}>
                            {fmt(deal.asking_price)} · {deal.valuation_multiple.toFixed(2)}x · DSCR {deal.dscr.toFixed(2)}
                          </div>
                        </div>
                        <div style={{
                          fontSize: 12, fontWeight: 700,
                          color: gp > 0 ? "#D85A30" : "#10B981",
                          fontFamily: "'JetBrains Mono',monospace", flexShrink: 0,
                        }}>
                          {gp > 0 ? "+" : ""}{gp}%
                        </div>
                        <div style={{ flexShrink: 0, textAlign: "right" as any }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "2px 8px", borderRadius: 6,
                            fontSize: 10, fontWeight: 700,
                            background: vd.bg, color: vd.color, border: `1px solid ${vd.border}`,
                          }}>
                            {vd.emoji} {vd.label}
                          </span>
                          <div style={{
                            fontSize: 9, color: "#6B7280", marginTop: 3,
                            display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end",
                          }}>
                            <span style={{ color: "#6366F1", fontWeight: 600 }}>Why this surfaced:</span>
                            <span>{why}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </Card>
            )}
          </div>
        ) : (
          // ── Locked: personalized deal feed ────────────────────────────────
          <div>
            <SectionHeader
              title="Personalized Deal Feed"
              sub="Opportunities surfaced from your deal history and market signals"
              action={<ProBadge />}
            />
            <div style={{
              borderRadius: 14, overflow: "hidden",
              border: "1px solid rgba(99,102,241,0.2)",
            }}>
              <div style={{
                padding: "20px 24px",
                background: "linear-gradient(135deg,rgba(99,102,241,0.07),rgba(139,92,246,0.04))",
              }}>
                <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7, marginBottom: 20, maxWidth: 520 }}>
                  Based on your saved deals, industries, and live market signals — we surface opportunities worth reviewing before others catch them.
                </div>
                {/* Blurred ghost rows */}
                <div style={{ filter: "blur(4px)", pointerEvents: "none", userSelect: "none" as any, marginBottom: 20 }}>
                  {[
                    { ind: "Pest Control",    score: 84, gap: -18, label: "🟢 Pursue"          },
                    { ind: "HVAC",            score: 77, gap: -11, label: "🟡 Investigate"     },
                    { ind: "Senior Care",     score: 91, gap: -32, label: "🔥 High Conviction" },
                  ].map((row, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "10px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(99,102,241,0.15)", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 12, width: 120, borderRadius: 4, background: "rgba(255,255,255,0.08)", marginBottom: 5 }} />
                        <div style={{ height: 9, width: 80, borderRadius: 3, background: "rgba(255,255,255,0.04)" }} />
                      </div>
                      <div style={{ height: 12, width: 40, borderRadius: 3, background: "rgba(255,255,255,0.06)" }} />
                      <div style={{ height: 22, width: 90, borderRadius: 6, background: "rgba(99,102,241,0.12)" }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button style={{
                    padding: "10px 22px", borderRadius: 9, border: "none",
                    background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
                    color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>
                    Unlock Pro
                  </button>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>Personalized feed across all your saved deals.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}


// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────

export default function BuyerDashboard() {
  const [user, setUser]               = useState<any>(null);
  const [profile, setProfile]         = useState<Profile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [activeTab, setActiveTab]     = useState<TabId>("home");

  const [deals, setDeals]             = useState<DealRun[]>([]);
  const [dri, setDri]                 = useState<DriSnapshot[]>([]);
  const [trending, setTrending]       = useState<TrendingMultiple[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [loading, setLoadingMkt]     = useState(true);

  const [dealStatuses, setDealStatuses] = useState<Record<string, DealStatus>>({});
  const [favorites, setFavorites]       = useState<Set<string>>(new Set());
  const [notesDeal, setNotesDeal]       = useState<DealRun | null>(null);
  const [dealNotes, setDealNotes]       = useState<Record<string, DealNote[]>>({});
  const [dealIntel, setDealIntel]       = useState<Record<string, DealIntel>>({});
  // ── New modal/panel state ─────────────────────────────────────────────────
  const [analyzeModal, setAnalyzeModal]         = useState(false);
  const [detailDeal, setDetailDeal]             = useState<DealRun | null>(null);
  const [underwritingDeal, setUnderwritingDeal] = useState<DealRun | null>(null);
  const [showUpgradeModal, setShowUpgradeModal]   = useState(false);
  // Deal outcome tracking — proprietary training data
  const [outcomesMap, setOutcomesMap]           = useState<Map<string, DealOutcome>>(new Map());
  const [outcomeDeal, setOutcomeDeal]           = useState<DealRun | null>(null);
  const [showFirstLoginBanner, setShowFirstLoginBanner] = useState(() => {
    if (typeof window === "undefined") return false;
    // Show banner once per session after first login
    const shown = sessionStorage.getItem("nxtax_login_banner_shown");
    if (!shown) { sessionStorage.setItem("nxtax_login_banner_shown", "1"); return true; }
    return false;
  });

  const isPro       = profile?.plan === "pro" || profile?.plan === "premium";
  const userInitial = user?.email?.charAt(0)?.toUpperCase() ?? "?";

  // ── Free-plan monthly deal-analysis cap ───────────────────────────────────
  // 10 deal analyses per calendar month. Resets on the 1st.
  // Pro users bypass. Tracked in localStorage keyed by month.
  const FREE_MONTHLY_DEAL_LIMIT = 10;
  const currentMonthKey = React.useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const [dealAnalysesThisMonth, setDealAnalysesThisMonth] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const raw = localStorage.getItem("nxtax_deal_analyses_by_month");
      if (!raw) return 0;
      const obj = JSON.parse(raw);
      return obj[currentMonthKey] ?? 0;
    } catch { return 0; }
  });
  const dealAnalysesRemaining = Math.max(0, FREE_MONTHLY_DEAL_LIMIT - dealAnalysesThisMonth);
  const hitDealCap            = !isPro && dealAnalysesRemaining === 0;
  const nearDealCap           = !isPro && dealAnalysesRemaining <= 2 && dealAnalysesRemaining > 0;
  // Days until reset (shown in counter UI)
  const daysUntilReset = (() => {
    const now = new Date();
    const firstOfNext = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return Math.ceil((firstOfNext.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  })();
  const incrementDealAnalyses = React.useCallback(() => {
    if (isPro) return;
    const next = dealAnalysesThisMonth + 1;
    setDealAnalysesThisMonth(next);
    try {
      const raw = localStorage.getItem("nxtax_deal_analyses_by_month");
      const obj = raw ? JSON.parse(raw) : {};
      obj[currentMonthKey] = next;
      localStorage.setItem("nxtax_deal_analyses_by_month", JSON.stringify(obj));
    } catch {}
  }, [isPro, dealAnalysesThisMonth, currentMonthKey]);

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
    // Try the full SELECT first — includes evidence_profile for post-migration deals
    let { data, error } = await supabase
      .from("deal_runs")
      .select("id,tool_used,industry,asking_price,fair_value,valuation_multiple,dscr,overall_score,risk_level,city,state,created_at,confidence_grade,revenue,sde,benchmark_family,rma_naics_code,classification_confidence,reported_sde,usable_sde,benchmark_implied_sde,earnings_source,normalization_trust_score,normalization_confidence_level,normalization_flags_json,manual_review_required,benchmark_is_proxy,evidence_profile,red_flags,green_flags")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(50);
    // If the full select fails (usually because a new column isn't yet
    // visible to PostgREST's schema cache), fall back to the minimal set
    // that predates this migration. User still sees their deals.
    if (error) {
      console.warn("fetchDeals full-select failed, retrying minimal:", error.message);
      const fallback = await supabase
        .from("deal_runs")
        .select("id,tool_used,industry,asking_price,fair_value,valuation_multiple,dscr,overall_score,risk_level,city,state,created_at,confidence_grade,revenue,sde,benchmark_family,rma_naics_code,classification_confidence,reported_sde,usable_sde,benchmark_implied_sde,earnings_source,normalization_trust_score,normalization_confidence_level,normalization_flags_json,manual_review_required,benchmark_is_proxy")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(50);
      data = fallback.data;
      error = fallback.error;
      if (error) console.error("fetchDeals fallback also failed:", error.message);
    }
    const enriched: DealRun[] = (data || []).map(d => {
      const gap_pct = d.fair_value > 0
        ? Math.round(((d.asking_price - d.fair_value) / d.fair_value) * 100)
        : 0;
      const enriched = { ...d, gap_pct, signal: deriveSignal(gap_pct) };
      return { ...enriched, verdict: dealVerdict(enriched), oppScore: oppScore(enriched) };
    });
    setDeals(enriched);
    // Load recorded outcomes for this user (proprietary training data)
    if (user?.id) {
      fetchOutcomesForUser(user.id).then(setOutcomesMap).catch(() => {});
    }
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
      .select("industry_key,median_mvic_to_sde,median_mvic_to_revenue,p25_mvic_to_sde,p75_mvic_to_sde,sample_size")
      .eq("size_band", "mid")
      .order("sample_size", { ascending: false })
      .limit(12);
    // Map to the TrendingMultiple shape — both multiples + IQR for percentile math
    setTrending((bm || []).map((r: any) => ({
      industry_key:     r.industry_key,
      median_multiple:  r.median_mvic_to_sde,
      revenue_multiple: r.median_mvic_to_revenue ?? null,
      p25_sde_multiple: r.p25_mvic_to_sde ?? null,
      p75_sde_multiple: r.p75_mvic_to_sde ?? null,
      sample_size:      r.sample_size,
    })));
    setLoadingMkt(false);
  }, []);

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user) { fetchDeals(user.id); fetchFavorites(user.id); }
    else setLoadingDeals(false);
  }, [user, fetchDeals, fetchFavorites]);

  // ── Auto-open underwriting on first login if deals exist ──────────────────
  // Fires once after deals load — opens the most recent deal so the user
  // immediately sees the decision engine, not an empty dashboard.
  const autoOpenedRef = React.useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current) return;          // only once per session
    if (!user || loadingDeals) return;          // wait for auth + load
    if (underwritingDeal) return;               // already open
    if (deals.length === 0) return;             // no deals yet — empty state handles it
    autoOpenedRef.current = true;
    // Prefer last-viewed deal (returning user), fall back to most recent
    const lastId = (() => { try { return localStorage.getItem("nxtax_last_deal_id"); } catch { return null; } })();
    const target = (lastId && deals.find(d => d.id === lastId)) ?? deals[0];
    setUnderwritingDeal(target);
  }, [user, loadingDeals, deals, underwritingDeal]);

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
    // Increment the free-plan monthly counter (no-op for Pro)
    incrementDealAnalyses();
  };

  // ── Gate the "Analyze New Deal" entry point based on the monthly cap ──────
  const handleAnalyzeNewClick = () => {
    if (hitDealCap) {
      setShowUpgradeModal(true);
      return;
    }
    setAnalyzeModal(true);
  };

  // ── Open underwriting panel ───────────────────────────────────────────────
  const openUnderwriting = (deal: DealRun) => {
    setUnderwritingDeal(deal);
    // Persist last-viewed deal so returning users re-open it automatically
    try { localStorage.setItem("nxtax_last_deal_id", deal.id); } catch {}
  };

  // ── Open deal detail panel ────────────────────────────────────────────────
  const openDetail = (deal: DealRun) => setDetailDeal(deal);

  const TABS: { id: TabId; label: string }[] = [
    { id: "home",         label: "Home"        },
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
        .btn-qv { transition: background 0.12s, color 0.12s, border-color 0.12s }
        .btn-qv:hover { background: rgba(255,255,255,0.06) !important; color: #E2E8F0 !important; border-color: rgba(255,255,255,0.15) !important }
        .btn-uw { transition: background 0.12s, box-shadow 0.12s }
        .btn-uw:hover { background: rgba(99,102,241,0.2) !important; box-shadow: 0 0 0 1px rgba(99,102,241,0.4) }

        /* Trust badge tooltip */
        .nxtax-trust-badge:hover .nxtax-trust-tooltip {
          opacity: 1 !important;
          transform: translateY(0) !important;
          pointer-events: auto !important;
        }

        /* Underwriting panel responsive width — overrides inline styles */
        @media (max-width: 1024px) {
          .nxtax-uw-panel { width: 85vw !important; }
        }
        @media (max-width: 640px) {
          .nxtax-uw-panel { width: 100vw !important; min-width: 100vw !important; }
        }
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
                  color: activeTab === tab.id ? "#C4B5FD" : "#7C8593",
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
                  <span style={{ marginLeft: 4, fontSize: 9, color: "#6B7280" }}>🔒</span>
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
                fontSize: 11, color: "#7C8593", fontWeight: 600,
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
      {/* First-login confirmation banner */}
      {user && showFirstLoginBanner && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          zIndex: 500, maxWidth: 480, width: "calc(100% - 32px)",
          padding: "12px 16px 12px 14px",
          borderRadius: 12,
          background: "rgba(16,185,129,0.09)",
          border: "1px solid rgba(16,185,129,0.25)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>✅</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#6EE7B7", marginBottom: 2 }}>
              Your deals are saved to your account.
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.5 }}>
              We'll send you a secure link anytime you want to pick up where you left off.
            </div>
          </div>
          <button
            onClick={() => setShowFirstLoginBanner(false)}
            style={{ background: "none", border: "none", color: "#7C8593", fontSize: 16, cursor: "pointer", padding: "0 2px", lineHeight: 1, flexShrink: 0 }}
          >
            ×
          </button>
        </div>
      )}

      {!loadingUser && !user && <SignInRequired />}
      {loadingUser && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div style={{ fontSize: 13, color: "#6B7280" }}>Loading...</div>
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
                fontSize: 10, color: "#6B7280", textTransform: "uppercase",
                letterSpacing: "0.1em", fontWeight: 600, marginBottom: 6,
              }}>
                {TABS.find(t => t.id === activeTab)?.label}
              </div>
              <h1 style={{
                fontSize: "clamp(20px,2.5vw,28px)", fontWeight: 700, margin: 0,
                fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.02em", color: "#F1F5F9",
              }}>
                {activeTab === "home"         && "Welcome"}
                {activeTab === "dashboard"    && "Deal Command Center"}
                {activeTab === "my-deals"     && "My Deals"}
                {activeTab === "compare"      && "Compare Deals"}
                {activeTab === "market-intel" && "Market Intelligence"}
              </h1>
            </div>
            <button
              onClick={handleAnalyzeNewClick}
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

          {/* Free-plan monthly deal-analysis counter — visible when near or at cap */}
          {!isPro && (nearDealCap || hitDealCap) && (
            <div style={{
              marginBottom: 14,
              padding: "11px 14px", borderRadius: 10,
              background: hitDealCap ? "rgba(245,158,11,0.08)" : "rgba(99,102,241,0.05)",
              border: hitDealCap ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(99,102,241,0.22)",
              display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" as const,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>
                {hitDealCap ? "⚠️" : "📊"}
              </span>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: hitDealCap ? "#F59E0B" : "#A5B4FC", marginBottom: 2 }}>
                  {hitDealCap
                    ? `You've reached this month's free deal analyses`
                    : `${dealAnalysesRemaining} free deal ${dealAnalysesRemaining === 1 ? "analysis" : "analyses"} remaining this month`}
                </div>
                <div style={{ fontSize: 10, color: "#7C8593" }}>
                  {hitDealCap
                    ? `Resets in ${daysUntilReset} ${daysUntilReset === 1 ? "day" : "days"} · Saved deals remain fully accessible`
                    : `${FREE_MONTHLY_DEAL_LIMIT} analyses per month on free · Resets in ${daysUntilReset} ${daysUntilReset === 1 ? "day" : "days"}`}
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ flex: 1, minWidth: 120, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, (dealAnalysesThisMonth / FREE_MONTHLY_DEAL_LIMIT) * 100)}%`,
                  background: hitDealCap ? "#F59E0B" : "#818CF8",
                  transition: "width 0.3s ease",
                }} />
              </div>
              <button
                onClick={() => window.location.href = "/pricing"}
                style={{
                  padding: "6px 14px", borderRadius: 7, border: "none",
                  background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
                  color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  whiteSpace: "nowrap" as const,
                }}
              >
                Go unlimited
              </button>
            </div>
          )}

          {/* Stat cards — dashboard + my-deals (home has its own hero) */}
          {(activeTab === "dashboard" || activeTab === "my-deals") && (
            <StatCards deals={deals} loading={loadingDeals} />
          )}

          {/* Tab content */}
          <div className="tab-content">
            {activeTab === "home" && (
              <TabHome
                deals={deals}
                dri={dri}
                trending={trending}
                loading={loadingDeals}
                loading={loading}
                isPro={isPro}
                favorites={favorites}
                outcomesMap={outcomesMap}
                onTabChange={setActiveTab}
                onToggleFav={toggleFavorite}
                onOpenNotes={openNotes}
                onOpenDetail={openDetail}
                onOpenUnderwriting={openUnderwriting}
                onOpenOutcome={setOutcomeDeal}
                onAnalyzeNew={handleAnalyzeNewClick}
              />
            )}
            {activeTab === "dashboard" && (
              <TabDashboard
                deals={deals}
                dri={dri}
                trending={trending}
                loading={loadingDeals}
                loading={loading}
                isPro={isPro}
                favorites={favorites}
                outcomesMap={outcomesMap}
                onTabChange={setActiveTab}
                onToggleFav={toggleFavorite}
                onOpenNotes={openNotes}
                onOpenDetail={openDetail}
                onOpenUnderwriting={openUnderwriting}
                onOpenOutcome={setOutcomeDeal}
                onAnalyzeNew={handleAnalyzeNewClick}
              />
            )}
            {activeTab === "my-deals" && (
              <TabMyDeals
                deals={deals}
                loading={loadingDeals}
                isPro={isPro}
                dealStatuses={dealStatuses}
                favorites={favorites}
                outcomesMap={outcomesMap}
                onStatusChange={handleStatusChange}
                onToggleFav={toggleFavorite}
                onOpenNotes={openNotes}
                onOpenDetail={openDetail}
                onOpenUnderwriting={openUnderwriting}
                onOpenOutcome={setOutcomeDeal}
                onAnalyzeNew={handleAnalyzeNewClick}
              />
            )}
            {activeTab === "compare" && (
              <TabCompare deals={deals} isPro={isPro} onAnalyzeNew={handleAnalyzeNewClick} />
            )}
            {activeTab === "market-intel" && (
              <TabMarketIntel dri={dri} trending={trending} loading={loading} isPro={isPro} deals={deals} />
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
          onShowUpgrade={() => setShowUpgradeModal(true)}
        />
      )}

      {/* ── OUTCOME MODAL — proprietary training data capture ── */}
      {outcomeDeal && user && (
        <OutcomeModal
          dealRunId={outcomeDeal.id}
          userId={user.id}
          dealSummary={`${IL[outcomeDeal.industry] || outcomeDeal.industry}${outcomeDeal.city ? " · " + outcomeDeal.city : ""}${outcomeDeal.state ? ", " + outcomeDeal.state : ""} · ${fmt(outcomeDeal.asking_price)}`}
          askingPrice={outcomeDeal.asking_price}
          onClose={() => setOutcomeDeal(null)}
          onSaved={(saved) => {
            // Update local map so the row chip reflects the outcome immediately
            setOutcomesMap(prev => {
              const next = new Map(prev);
              next.set(saved.deal_run_id, saved);
              return next;
            });
          }}
        />
      )}

      {/* ── UPGRADE MODAL ── */}
      {showUpgradeModal && (
        <>
          <div
            onClick={() => setShowUpgradeModal(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 400, backdropFilter: "blur(4px)" }}
          />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            zIndex: 401, width: "100%", maxWidth: 380, padding: 32,
            borderRadius: 18, background: "#0D1117",
            border: "1px solid rgba(99,102,241,0.25)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
            textAlign: "center" as const,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{hitDealCap ? "📊" : "⚡"}</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#F1F5F9", margin: "0 0 10px", fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.02em" }}>
              {hitDealCap ? "You're in the pipeline" : "Finish your underwriting"}
            </h2>
            <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, margin: "0 0 20px" }}>
              {hitDealCap
                ? `You've analyzed ${FREE_MONTHLY_DEAL_LIMIT} deals this month — clearly screening seriously. Go unlimited and get the full playbook on every one.`
                : "You've seen how this deal performs. Now unlock full analysis, comps, and negotiation strategy."}
            </p>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 5, marginBottom: 20, textAlign: "left" as const }}>
              {["Full stress test & downside scenarios","SBA loan structure & DSCR","Negotiation anchor & walk-away price","Market comps & percentile ranking","Complete deal memo"].map(b => (
                <div key={b} style={{ display: "flex", gap: 8, fontSize: 12, color: "#94A3B8" }}>
                  <span style={{ color: "#818CF8" }}>✓</span>{b}
                </div>
              ))}
            </div>
            <a
              href="/pricing"
              style={{
                display: "block", width: "100%", padding: "13px 0", borderRadius: 10,
                background: "linear-gradient(135deg,#6366F1,#818CF8)",
                color: "#fff", fontSize: 15, fontWeight: 700,
                textDecoration: "none", marginBottom: 10,
              }}
            >
              Upgrade to Pro →
            </a>
            <button
              onClick={() => setShowUpgradeModal(false)}
              style={{ background: "none", border: "none", color: "#6B7280", fontSize: 12, cursor: "pointer" }}
            >
              Maybe later
            </button>
          </div>
        </>
      )}
    </div>
  );
}
