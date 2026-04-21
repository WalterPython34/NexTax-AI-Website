// components/DealMemoTab.tsx
// Deal Memo Tab — pre-LOI decision document.
//
// Structure:
//   1. Deal Summary
//   2. What Must Be True
//   3. Red Flags & Risks  (new — 3-tier)
//   4. Key Diligence Priorities
//   5. Key Questions to Ask Seller  (new — 5 categories, side-by-side on wide)
//   6. Final Recommendation

"use client";

import React from "react";
import type { RiskFlag, QuestionGroup, DiligenceQuestion } from "@/lib/dealMemo";

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
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARD ATOM
// ═══════════════════════════════════════════════════════════════════════════════

function MemoCard({
  title,
  children,
  right,
}: {
  title:    string;
  children: React.ReactNode;
  right?:   React.ReactNode;
}) {
  return (
    <div style={{
      padding: "14px 18px",
      borderRadius: 10,
      background: T.bgCard,
      border: `1px solid ${T.border}`,
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
      }}>
        <div style={{
          fontSize: 10, color: T.textMuted,
          textTransform: "uppercase" as const,
          letterSpacing: "0.08em",
          fontWeight: 700,
          fontFamily: T.sans,
        }}>
          {title}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. BULLET ROWS
// ═══════════════════════════════════════════════════════════════════════════════

function BulletList({ items, color = T.indigo }: { items: string[]; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((b, i) => (
        <div key={i} style={{
          display: "flex", gap: 10, alignItems: "flex-start",
          fontSize: 12, color: T.textSub, lineHeight: 1.55,
        }}>
          <span style={{ color, flexShrink: 0, marginTop: 1, fontWeight: 700 }}>→</span>
          <span>{b}</span>
        </div>
      ))}
    </div>
  );
}

function ProseBlock({ content }: { content: string }) {
  return (
    <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.7 }}>
      {content}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. RED FLAGS — 3-tier grouped display
// ═══════════════════════════════════════════════════════════════════════════════

const LEVEL_STYLE: Record<RiskFlag["level"], { color: string; bg: string; label: string; icon: string }> = {
  high:   { color: "#EF4444", bg: "rgba(239,68,68,0.07)",   label: "High Risk",    icon: "●" },
  medium: { color: "#F59E0B", bg: "rgba(245,158,11,0.07)",  label: "Medium Risk",  icon: "●" },
  low:    { color: "#64748B", bg: "rgba(100,116,139,0.06)", label: "Low Risk",     icon: "●" },
};

function RiskFlagsSection({ flags }: { flags: RiskFlag[] }) {
  const grouped = {
    high:   flags.filter(f => f.level === "high"),
    medium: flags.filter(f => f.level === "medium"),
    low:    flags.filter(f => f.level === "low"),
  };

  const summary = (
    <div style={{ display: "flex", gap: 8 }}>
      {(["high", "medium", "low"] as const).map((lvl) => {
        const style = LEVEL_STYLE[lvl];
        const count = grouped[lvl].length;
        return (
          <div key={lvl} style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "2px 8px", borderRadius: 20,
            background: style.bg,
            border: `1px solid ${style.color}22`,
            fontSize: 10, fontFamily: T.mono,
          }}>
            <span style={{ color: style.color }}>{style.icon}</span>
            <span style={{ color: style.color, fontWeight: 700 }}>{count}</span>
          </div>
        );
      })}
    </div>
  );

  if (flags.length === 0) {
    return (
      <MemoCard title="Red Flags & Risks">
        <div style={{ fontSize: 12, color: T.green, lineHeight: 1.6 }}>
          No material risk signals detected. Complete standard diligence before advancing.
        </div>
      </MemoCard>
    );
  }

  return (
    <MemoCard title="Red Flags & Risks" right={summary}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {(["high", "medium", "low"] as const).map((lvl) => {
          if (grouped[lvl].length === 0) return null;
          const style = LEVEL_STYLE[lvl];
          return (
            <div key={lvl}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: style.color,
                marginBottom: 7,
                fontFamily: T.sans,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ fontSize: 10 }}>{style.icon}</span>
                {style.label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {grouped[lvl].map((flag, i) => (
                  <div key={i} style={{
                    padding: "8px 11px", borderRadius: 7,
                    background: style.bg,
                    border: `1px solid ${style.color}22`,
                    fontSize: 12, color: T.textSub, lineHeight: 1.5,
                  }}>
                    {flag.text}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </MemoCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. DILIGENCE QUESTIONS — 5 grouped categories, 2-column grid on wide
// ═══════════════════════════════════════════════════════════════════════════════

function QuestionGroupCard({ group }: { group: QuestionGroup }) {
  const priorityCount = group.items.filter(q => q.priority).length;

  return (
    <div style={{
      padding: "12px 14px",
      borderRadius: 8,
      background: T.bgInset,
      border: `1px solid ${T.borderLight}`,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 10,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: T.text,
          fontFamily: T.sans,
        }}>
          {group.title}
        </div>
        {priorityCount > 0 && (
          <div style={{
            fontSize: 9, fontWeight: 700, color: T.amber,
            padding: "2px 7px", borderRadius: 20,
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.25)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.06em",
          }}>
            {priorityCount} priority
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {group.items.map((q: DiligenceQuestion, i: number) => (
          <div key={i} style={{
            display: "flex", gap: 9, alignItems: "flex-start",
            fontSize: 11, lineHeight: 1.5,
            color: q.priority ? T.text : T.textSub,
          }}>
            <span style={{
              color: q.priority ? T.amber : T.indigo,
              flexShrink: 0,
              marginTop: 1,
              fontWeight: 700,
              fontFamily: T.mono,
              fontSize: 10,
              minWidth: 14,
            }}>
              {q.priority ? "★" : `${i + 1}.`}
            </span>
            <span>{q.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiligenceQuestionsSection({ groups }: { groups: QuestionGroup[] }) {
  return (
    <MemoCard title="Key Questions to Ask Seller">
      <div style={{ fontSize: 10, color: T.textMuted, lineHeight: 1.5, marginBottom: 12 }}>
        Questions marked with <span style={{ color: T.amber, fontWeight: 700 }}>★</span> are elevated by specific risk signals on this deal.
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: 10,
      }}>
        {groups.map((g) => <QuestionGroupCard key={g.category} group={g} />)}
      </div>
    </MemoCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface DealMemoTabProps {
  /** Deal summary paragraph (pre-composed by parent — industry, location, pricing) */
  summary: string;
  /** "What Must Be True" bullets */
  mustBeTrue: string[];
  /** Risk flags — grouped by level */
  riskFlags: RiskFlag[];
  /** "Key Diligence Priorities" bullets */
  diligencePriorities: string[];
  /** Diligence question groups — 5 categories */
  questionGroups: QuestionGroup[];
  /** Final recommendation — formatted string with emoji prefix */
  finalRecommendation: string;
}

export function DealMemoTab({
  summary,
  mustBeTrue,
  riskFlags,
  diligencePriorities,
  questionGroups,
  finalRecommendation,
}: DealMemoTabProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* 1. Deal Summary */}
      <MemoCard title="Deal Summary">
        <ProseBlock content={summary} />
      </MemoCard>

      {/* 2. What Must Be True + Red Flags — side-by-side on wide */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
        gap: 12,
      }}>
        <MemoCard title="What Must Be True">
          <BulletList items={mustBeTrue} />
        </MemoCard>

        <RiskFlagsSection flags={riskFlags} />
      </div>

      {/* 3. Key Diligence Priorities */}
      <MemoCard title="Key Diligence Priorities">
        <BulletList items={diligencePriorities} color={T.amber} />
      </MemoCard>

      {/* 4. Diligence Questions — 5-category grid */}
      <DiligenceQuestionsSection groups={questionGroups} />

      {/* 5. Final Recommendation */}
      <MemoCard title="Final Recommendation">
        <ProseBlock content={finalRecommendation} />
      </MemoCard>
    </div>
  );
}

export default DealMemoTab;
