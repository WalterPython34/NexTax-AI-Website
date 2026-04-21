// components/LenderReadinessTab.tsx
// Lender Readiness Tab — renders the output of buildLenderReadiness()
// Designed to feel like an institutional prequal screen.

"use client";

import React from "react";
import type {
  LenderReadinessOutput, LenderMetric, WhyBullet,
  DocGroup, DocItem, ImprovementAction,
} from "@/lib/lenderReadiness";

const T = {
  bg:          "#0D1117",
  bgCard:      "rgba(255,255,255,0.018)",
  bgInset:     "rgba(255,255,255,0.025)",
  border:      "rgba(255,255,255,0.07)",
  borderLight: "rgba(255,255,255,0.04)",
  text:        "#F1F5F9",
  textSub:     "#94A3B8",
  textMuted:   "#4B5563",
  mono:        "'JetBrains Mono', monospace",
  sans:        "'Inter Tight', sans-serif",
  green:       "#10B981",  greenBg:  "rgba(16,185,129,0.07)",  greenBd:  "rgba(16,185,129,0.22)",
  amber:       "#F59E0B",  amberBg:  "rgba(245,158,11,0.07)",  amberBd:  "rgba(245,158,11,0.22)",
  red:         "#EF4444",  redBg:    "rgba(239,68,68,0.07)",   redBd:    "rgba(239,68,68,0.22)",
  indigo:      "#818CF8",  indigoBg: "rgba(129,140,248,0.06)", indigoBd: "rgba(129,140,248,0.2)",
  slate:       "#64748B",  slateBg:  "rgba(100,116,139,0.07)", slateBd:  "rgba(100,116,139,0.2)",
  teal:        "#2DD4BF",
};

// ═══════════════════════════════════════════════════════════════════════════════
// VERDICT HERO
// ═══════════════════════════════════════════════════════════════════════════════

const VERDICT_COLOR: Record<string, { color: string; bg: string; bd: string; icon: string }> = {
  likely_financeable: { color: T.green,  bg: T.greenBg,  bd: T.greenBd,  icon: "✅" },
  borderline:         { color: T.amber,  bg: T.amberBg,  bd: T.amberBd,  icon: "⚠️" },
  not_financeable:    { color: T.red,    bg: T.redBg,    bd: T.redBd,    icon: "❌" },
  manual_review:      { color: T.indigo, bg: T.indigoBg, bd: T.indigoBd, icon: "🔍" },
};

function VerdictHero({ data }: { data: LenderReadinessOutput }) {
  const v = VERDICT_COLOR[data.verdict];

  return (
    <div style={{
      padding: "18px 20px", borderRadius: 12,
      background: v.bg, border: `1px solid ${v.bd}`,
      marginBottom: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 22 }}>{v.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 3 }}>
            Lender Verdict
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: v.color, fontFamily: T.sans, letterSpacing: "-0.01em" }}>
            {data.verdictLabel}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.6, paddingTop: 10, borderTop: `1px solid ${v.bd}` }}>
        {data.verdictMessage}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRICS GRID
// ═══════════════════════════════════════════════════════════════════════════════

function statusColor(s: LenderMetric["status"]): string {
  if (s === "pass") return T.green;
  if (s === "warn") return T.amber;
  if (s === "fail") return T.red;
  return T.slate;
}

function MetricsGrid({ metrics }: { metrics: LenderMetric[] }) {
  return (
    <div style={{ padding: "15px 18px", borderRadius: 12, background: T.bgCard, border: `1px solid ${T.border}`, marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textMuted, fontFamily: T.sans, marginBottom: 12 }}>
        Core Metrics
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {metrics.map((m) => (
          <div key={m.label} style={{
            padding: "10px 12px", borderRadius: 9,
            background: T.bgInset, border: `1px solid ${T.borderLight}`,
          }}>
            <div style={{ fontSize: 9, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>
              {m.label}
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: statusColor(m.status), fontFamily: T.mono, marginBottom: 3 }}>
              {m.value}
            </div>
            {m.note && (
              <div style={{ fontSize: 9, color: T.textMuted, lineHeight: 1.4 }}>
                {m.note}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WHY / WHY NOT BLOCK
// ═══════════════════════════════════════════════════════════════════════════════

function severityColor(s: WhyBullet["severity"]): string {
  if (s === "positive") return T.green;
  if (s === "neutral")  return T.slate;
  if (s === "warning")  return T.amber;
  return T.red;
}

function severityIcon(s: WhyBullet["severity"]): string {
  if (s === "positive") return "✓";
  if (s === "neutral")  return "·";
  if (s === "warning")  return "!";
  return "✗";
}

function WhyBlock({ bullets }: { bullets: WhyBullet[] }) {
  return (
    <div style={{ padding: "15px 18px", borderRadius: 12, background: T.bgCard, border: `1px solid ${T.border}`, marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textMuted, fontFamily: T.sans, marginBottom: 11 }}>
        Why This Deal Is / Is Not Lender-Ready
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {bullets.map((b, i) => {
          const c = severityColor(b.severity);
          return (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%",
                background: `${c}18`, border: `1px solid ${c}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800, color: c, flexShrink: 0, marginTop: 1,
                fontFamily: T.mono,
              }}>
                {severityIcon(b.severity)}
              </div>
              <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.6 }}>
                {b.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDUSTRY FIT
// ═══════════════════════════════════════════════════════════════════════════════

const FIT_COLOR: Record<string, string> = {
  preferred:        T.green,
  non_preferred:    T.amber,
  sba_ineligible:   T.red,
  requires_review:  T.slate,
};

function IndustryFitSection({ fit }: { fit: LenderReadinessOutput["industryFit"] }) {
  const c = FIT_COLOR[fit.state];
  return (
    <div style={{ padding: "15px 18px", borderRadius: 12, background: T.bgCard, border: `1px solid ${T.border}`, marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textMuted, fontFamily: T.sans, marginBottom: 11 }}>
        Industry Fit
      </div>
      <div style={{ display: "inline-block", padding: "5px 12px", borderRadius: 20, background: `${c}18`, border: `1px solid ${c}44`, marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: c, fontFamily: T.sans, letterSpacing: "-0.005em" }}>
          {fit.label}
        </span>
      </div>
      <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.6 }}>
        {fit.note}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT CHECKLIST
// ═══════════════════════════════════════════════════════════════════════════════

const DOC_STATE_STYLE: Record<DocItem["state"], { color: string; bg: string; icon: string; label: string }> = {
  complete:        { color: T.green, bg: T.greenBg, icon: "✓", label: "Complete" },
  missing:         { color: T.red,   bg: T.redBg,   icon: "✗", label: "Missing"  },
  unknown:         { color: T.slate, bg: T.slateBg, icon: "?", label: "Needed"   },
  not_applicable:  { color: T.slate, bg: T.bgInset, icon: "—", label: "N/A"       },
};

function ChecklistGroup({ group }: { group: DocGroup }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.text, fontFamily: T.sans, marginBottom: 8, letterSpacing: "-0.005em" }}>
        {group.title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {group.items.map((item) => {
          const s = DOC_STATE_STYLE[item.state];
          return (
            <div key={item.id} style={{
              display: "flex", gap: 10, alignItems: "flex-start",
              padding: "8px 11px", borderRadius: 8,
              background: s.bg, border: `1px solid ${s.color}22`,
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%",
                background: `${s.color}22`, border: `1px solid ${s.color}66`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800, color: s.color, flexShrink: 0, marginTop: 1,
                fontFamily: T.mono,
              }}>
                {s.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: T.text, lineHeight: 1.5 }}>
                  {item.label}
                </div>
                {item.note && (
                  <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>
                    {item.note}
                  </div>
                )}
              </div>
              <span style={{
                fontSize: 9, fontWeight: 700,
                color: s.color, textTransform: "uppercase", letterSpacing: "0.06em",
                padding: "2px 7px", borderRadius: 20,
                border: `1px solid ${s.color}55`, flexShrink: 0, whiteSpace: "nowrap",
              }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DocumentChecklist({ groups }: { groups: DocGroup[] }) {
  return (
    <div style={{ padding: "15px 18px", borderRadius: 12, background: T.bgCard, border: `1px solid ${T.border}`, marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textMuted, fontFamily: T.sans, marginBottom: 13 }}>
        Document Readiness
      </div>
      {groups.map((g) => <ChecklistGroup key={g.id} group={g} />)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMPROVEMENT ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const PRIORITY_COLOR: Record<string, string> = {
  critical: T.red,
  high:     T.amber,
  standard: T.slate,
};

function ImprovementActions({ actions }: { actions: ImprovementAction[] }) {
  if (actions.length === 0) return null;

  return (
    <div style={{ padding: "15px 18px", borderRadius: 12, background: T.bgCard, border: `1px solid ${T.border}`, marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textMuted, fontFamily: T.sans, marginBottom: 11 }}>
        What Would Improve Lender Readiness
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {actions.map((a, i) => {
          const c = PRIORITY_COLOR[a.priority];
          return (
            <div key={i} style={{
              display: "flex", gap: 10, alignItems: "flex-start",
              padding: "9px 12px", borderRadius: 8,
              background: T.bgInset, border: `1px solid ${T.borderLight}`,
            }}>
              <span style={{
                fontSize: 8, fontWeight: 800, color: c,
                padding: "2px 7px", borderRadius: 20,
                background: `${c}18`, border: `1px solid ${c}55`,
                textTransform: "uppercase", letterSpacing: "0.07em",
                flexShrink: 0, whiteSpace: "nowrap", marginTop: 1,
                fontFamily: T.sans, minWidth: 60, textAlign: "center",
              }}>
                {a.priority}
              </span>
              <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.6 }}>
                {a.text}
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

export function LenderReadinessTab({ data }: { data: LenderReadinessOutput }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <VerdictHero         data={data} />
      <MetricsGrid         metrics={data.metrics} />
      <WhyBlock            bullets={data.whyBullets} />
      <IndustryFitSection  fit={data.industryFit} />
      <DocumentChecklist   groups={data.docGroups} />
      <ImprovementActions  actions={data.improvements} />

      {/* Footer disclaimer */}
      <div style={{
        marginTop: 6, padding: "10px 14px", borderRadius: 10,
        background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.12)",
        fontSize: 10, color: T.textMuted, lineHeight: 1.6,
      }}>
        This is a pre-screen assessment based on deal metrics and general SBA lender guidelines.
        Individual lender overlays, credit profile, and equity structure will affect final qualification.
        Consult an SBA-preferred lender for formal prequal.
      </div>
    </div>
  );
}

export default LenderReadinessTab;
