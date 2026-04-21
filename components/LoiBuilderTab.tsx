// components/LoiBuilderTab.tsx
// LOI Builder Tab — converts underwriting outputs into buyer-ready offer structure.
//
// Sections:
//   1. Hero — Recommended LOI Structure (stance + 4 price anchors)
//   2. Suggested Deal Structure (9 items in grid)
//   3. Why this LOI structure fits this deal (4–6 bullets)
//   4. Protections to Include
//   5. Terms to Confirm Before Sending LOI (checklist)

"use client";

import React from "react";
import type {
  LoiBuilderOutput,
  StructureItem,
  ProtectionItem,
  ChecklistItem,
  StructureStance,
} from "@/lib/loiBuilder";

const T = {
  bgCard:      "rgba(255,255,255,0.02)",
  bgInset:     "rgba(255,255,255,0.025)",
  border:      "rgba(255,255,255,0.06)",
  borderLight: "rgba(255,255,255,0.04)",
  text:        "#F1F5F9",
  textSub:     "#94A3B8",
  textMuted:   "#4B5563",
  mono:        "'JetBrains Mono', monospace",
  sans:        "'Inter Tight', sans-serif",
  green:       "#10B981",
  amber:       "#F59E0B",
  red:         "#EF4444",
  indigo:      "#818CF8",
  slate:       "#64748B",
  teal:        "#2DD4BF",
  blue:        "#60A5FA",
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function fmt$(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

const STANCE_COLOR: Record<StructureStance, { color: string; bg: string; bd: string; icon: string }> = {
  aggressive:   { color: T.green,  bg: "rgba(16,185,129,0.06)",  bd: "rgba(16,185,129,0.22)", icon: "🎯" },
  balanced:     { color: T.blue,   bg: "rgba(96,165,250,0.06)",  bd: "rgba(96,165,250,0.22)", icon: "⚖️" },
  conservative: { color: T.amber,  bg: "rgba(245,158,11,0.06)",  bd: "rgba(245,158,11,0.22)", icon: "🛡️" },
  protective:   { color: T.red,    bg: "rgba(239,68,68,0.06)",   bd: "rgba(239,68,68,0.22)",  icon: "🚧" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1. HERO — RECOMMENDED LOI STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

function PricePillar({ label, value, pct, color, sub }: {
  label: string;
  value: number;
  pct:   number;
  color: string;
  sub:   string;
}) {
  return (
    <div style={{
      padding: "11px 14px", borderRadius: 9,
      background: T.bgInset,
      border: `1px solid ${color}22`,
      flex: 1, minWidth: 140,
    }}>
      <div style={{
        fontSize: 9, color: T.textMuted,
        textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 6,
        fontWeight: 700,
      }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color, fontFamily: T.mono, letterSpacing: "-0.01em" }}>
          {fmt$(value)}
        </span>
        <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.mono }}>
          {pct}% FV
        </span>
      </div>
      <div style={{ fontSize: 10, color: T.textMuted, lineHeight: 1.5 }}>
        {sub}
      </div>
    </div>
  );
}

function RecommendedLoiHero({ data }: { data: LoiBuilderOutput }) {
  const s = STANCE_COLOR[data.stance];

  return (
    <div style={{
      padding: "16px 18px", borderRadius: 12,
      background: s.bg, border: `1px solid ${s.bd}`,
      marginBottom: 12,
    }}>
      {/* Stance header */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{s.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.1em", fontWeight: 700, marginBottom: 3 }}>
            Recommended LOI Structure
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: s.color, fontFamily: T.sans, letterSpacing: "-0.01em" }}>
            {data.stanceLabel}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.6, paddingBottom: 14, marginBottom: 14, borderBottom: `1px solid ${s.bd}` }}>
        {data.stanceMessage}
      </div>

      {/* Price pillars */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 10,
      }}>
        <PricePillar
          label="Anchor Offer"
          value={data.anchorOffer}
          pct={data.anchorPctOfFv}
          color={T.indigo}
          sub="Where disciplined first paper should start"
        />
        <PricePillar
          label="Target Low"
          value={data.targetRangeLow}
          pct={data.targetLowPctOfFv}
          color={T.teal}
          sub="Low end of reasonable zone to win the deal"
        />
        <PricePillar
          label="Target High"
          value={data.targetRangeHigh}
          pct={data.targetHighPctOfFv}
          color={T.green}
          sub="Upper end of acceptable negotiation zone"
        />
        <PricePillar
          label="Walk-Away"
          value={data.walkAwayPrice}
          pct={data.walkAwayPctOfFv}
          color={T.amber}
          sub="Highest justified price before returns compress"
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SUGGESTED DEAL STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

function StructureItemCard({ item }: { item: StructureItem }) {
  const priorityBadge = item.priority === "critical";
  return (
    <div style={{
      padding: "11px 13px", borderRadius: 8,
      background: T.bgInset,
      border: `1px solid ${priorityBadge ? "rgba(245,158,11,0.22)" : T.borderLight}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.text, fontFamily: T.sans }}>
          {item.label}
        </div>
        {priorityBadge && (
          <span style={{
            fontSize: 8, fontWeight: 700, color: T.amber,
            padding: "2px 6px", borderRadius: 20,
            background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
            textTransform: "uppercase" as const, letterSpacing: "0.06em",
          }}>
            Critical
          </span>
        )}
      </div>
      <div style={{
        fontSize: 13, fontWeight: 800, color: T.indigo,
        fontFamily: T.mono, marginBottom: 6, letterSpacing: "-0.005em",
      }}>
        {item.value}
      </div>
      <div style={{ fontSize: 10, color: T.textSub, lineHeight: 1.5 }}>
        {item.explanation}
      </div>
    </div>
  );
}

function StructureSection({ items }: { items: StructureItem[] }) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 10,
      background: T.bgCard, border: `1px solid ${T.border}`,
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.1em", fontFamily: T.sans, marginBottom: 12 }}>
        Suggested Deal Structure
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
        gap: 8,
      }}>
        {items.map(item => <StructureItemCard key={item.id} item={item} />)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. FIT BULLETS
// ═══════════════════════════════════════════════════════════════════════════════

function FitBullets({ bullets }: { bullets: string[] }) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 10,
      background: T.bgCard, border: `1px solid ${T.border}`,
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.1em", fontFamily: T.sans, marginBottom: 11 }}>
        Why This LOI Structure Fits This Deal
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {bullets.map((b, i) => (
          <div key={i} style={{
            display: "flex", gap: 10, alignItems: "flex-start",
            fontSize: 12, color: T.textSub, lineHeight: 1.6,
          }}>
            <span style={{ color: T.indigo, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>→</span>
            <span>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. BUYER PROTECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function ProtectionsSection({ items }: { items: ProtectionItem[] }) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 10,
      background: T.bgCard, border: `1px solid ${T.border}`,
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.1em", fontFamily: T.sans, marginBottom: 12 }}>
        Protections to Include
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 8,
      }}>
        {items.map((p, i) => (
          <div key={i} style={{
            padding: "10px 12px", borderRadius: 8,
            background: T.bgInset, border: `1px solid ${T.borderLight}`,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: T.text,
              fontFamily: T.sans, marginBottom: 5,
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <span style={{ color: T.teal, fontSize: 11 }}>🛡</span>
              {p.label}
            </div>
            <div style={{ fontSize: 10, color: T.textSub, lineHeight: 1.55 }}>
              {p.why}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. LOI CHECKLIST
// ═══════════════════════════════════════════════════════════════════════════════

function LoiChecklist({ items }: { items: ChecklistItem[] }) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 10,
      background: T.bgCard, border: `1px solid ${T.border}`,
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.1em", fontFamily: T.sans, marginBottom: 4 }}>
        Terms to Confirm Before Sending LOI
      </div>
      <div style={{ fontSize: 10, color: T.textMuted, lineHeight: 1.5, marginBottom: 12 }}>
        Values are prefilled from the recommendations above. Confirm or replace each before sending.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {items.map((item, i) => {
          const isDefine = item.value?.startsWith("Define before sending") ?? true;
          return (
            <div key={item.id} style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "9px 12px", borderRadius: 7,
              background: T.bgInset, border: `1px solid ${T.borderLight}`,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: T.indigo, fontFamily: T.mono,
                flexShrink: 0, marginTop: 1,
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.text, marginBottom: 3 }}>
                  {item.label}
                </div>
                <div style={{
                  fontSize: 11, color: isDefine ? T.amber : T.textSub,
                  fontFamily: isDefine ? T.sans : T.mono,
                  lineHeight: 1.5,
                }}>
                  {item.value ?? "Define before sending"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LoiBuilderTab({ data }: { data: LoiBuilderOutput }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <RecommendedLoiHero data={data} />
      <StructureSection   items={data.structureItems} />
      <FitBullets         bullets={data.fitBullets} />
      <ProtectionsSection items={data.protections} />
      <LoiChecklist       items={data.checklistItems} />

      {/* Footer — export-readiness note for future expansion */}
      <div style={{
        marginTop: 6, padding: "10px 13px", borderRadius: 9,
        background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.12)",
        fontSize: 10, color: T.textMuted, lineHeight: 1.6,
      }}>
        This structure is a disciplined offer framework — not a legal document. Confirm all terms with your M&amp;A attorney before signing any letter of intent or binding agreement.
      </div>
    </div>
  );
}

export default LoiBuilderTab;
