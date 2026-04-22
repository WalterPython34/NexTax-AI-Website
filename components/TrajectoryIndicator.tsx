// components/TrajectoryIndicator.tsx
//
// Two components for the layered trajectory UX:
//
//   <TrajectoryChip />      — UW panel, one-line hook
//   <TrajectoryBreakdown /> — Deal detail page, drivers + timeline + confidence
//
// Philosophy:
//   Chip = "positive trajectory" — fast, scannable, decision-anchor
//   Breakdown = "positive because X, Y, Z" — explanation layer

"use client";

import React from "react";
import type { TrajectoryBreakdown as TrajectoryData, TrajectoryLabel, TrajectoryDriver } from "@/lib/dealTrajectory";

// ═══════════════════════════════════════════════════════════════════════════════
// STYLE TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

const LABEL_STYLE: Record<TrajectoryLabel, { color: string; bg: string; bd: string; glyph: string }> = {
  improving:    { color: "#10B981", bg: "rgba(16,185,129,0.08)",  bd: "rgba(16,185,129,0.28)",  glyph: "▲" },
  flat:         { color: "#94A3B8", bg: "rgba(148,163,184,0.08)", bd: "rgba(148,163,184,0.28)", glyph: "—" },
  declining:    { color: "#F87171", bg: "rgba(239,68,68,0.08)",   bd: "rgba(239,68,68,0.28)",   glyph: "▼" },
  new_listing:  { color: "#60A5FA", bg: "rgba(96,165,250,0.06)",  bd: "rgba(96,165,250,0.22)",  glyph: "●" },
  insufficient: { color: "#64748B", bg: "rgba(100,116,139,0.06)", bd: "rgba(100,116,139,0.22)", glyph: "?" },
};

const DRIVER_COLOR = {
  positive: "#10B981",
  negative: "#F87171",
  neutral:  "#94A3B8",
} as const;

const CONFIDENCE_COLOR = {
  high:   "#10B981",
  medium: "#F59E0B",
  low:    "#94A3B8",
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. COMPACT CHIP — for UW panel (hook layer)
// ═══════════════════════════════════════════════════════════════════════════════

export function TrajectoryChip({ data, onClick }: { data: TrajectoryData; onClick?: () => void }) {
  const s = LABEL_STYLE[data.label];
  const clickable = !!onClick;

  return (
    <div
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 11px",
        borderRadius: 20,
        background: s.bg,
        border: `1px solid ${s.bd}`,
        cursor: clickable ? "pointer" : "default",
        transition: "background 140ms ease, border-color 140ms ease",
        fontFamily: "'Inter Tight', sans-serif",
      }}
      onMouseEnter={(e) => {
        if (clickable) {
          e.currentTarget.style.background = s.bg.replace("0.08", "0.14").replace("0.06", "0.1");
        }
      }}
      onMouseLeave={(e) => {
        if (clickable) e.currentTarget.style.background = s.bg;
      }}
    >
      <span style={{ color: s.color, fontSize: 10, fontWeight: 700 }}>{s.glyph}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: s.color, letterSpacing: "0.01em" }}>
        {data.labelText} trajectory
      </span>
      {clickable && (
        <span style={{ fontSize: 10, color: s.color, opacity: 0.6, marginLeft: 2 }}>›</span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. EXPANDED BREAKDOWN — for deal detail page (explanation layer)
// ═══════════════════════════════════════════════════════════════════════════════

function DriverRow({ driver }: { driver: TrajectoryDriver }) {
  const c = DRIVER_COLOR[driver.direction];
  const glyph = driver.direction === "positive" ? "▲" : driver.direction === "negative" ? "▼" : "—";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "9px 12px",
      borderRadius: 8,
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.04)",
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%",
        background: `${c}18`, border: `1px solid ${c}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: c, fontSize: 10, fontWeight: 700, flexShrink: 0,
      }}>
        {glyph}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: "#E2E8F0", fontWeight: 500, lineHeight: 1.4 }}>
          {driver.label}
        </div>
        <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
          {driver.detail}
        </div>
      </div>
    </div>
  );
}

function TimelineDot({
  date, price, isFirst, isLast, color,
}: { date: string; price: number; isFirst: boolean; isLast: boolean; color: string }) {
  return (
    <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 70 }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%", background: color,
        boxShadow: isLast ? `0 0 0 3px ${color}33` : "none",
      }} />
      <div style={{ fontSize: 9, color: "#7C8593", fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap" }}>
        {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </div>
      <div style={{
        fontSize: 10,
        color: isLast ? color : "#94A3B8",
        fontFamily: "'JetBrains Mono',monospace",
        fontWeight: isLast ? 600 : 400,
        whiteSpace: "nowrap",
      }}>
        ${(price / 1000).toFixed(0)}K
      </div>
    </div>
  );
}

export function TrajectoryBreakdown({ data }: { data: TrajectoryData }) {
  const s = LABEL_STYLE[data.label];
  const cConf = CONFIDENCE_COLOR[data.confidence];

  return (
    <div style={{
      padding: "16px 18px",
      borderRadius: 12,
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      {/* Header — label + confidence */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, fontFamily: "'Inter Tight',sans-serif" }}>
            Deal Trajectory
          </span>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "3px 10px", borderRadius: 20,
            background: s.bg, border: `1px solid ${s.bd}`,
          }}>
            <span style={{ color: s.color, fontSize: 10, fontWeight: 700 }}>{s.glyph}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: s.color }}>{data.labelText}</span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
            Confidence
          </span>
          <span style={{
            padding: "2px 8px", borderRadius: 20,
            background: `${cConf}14`, border: `1px solid ${cConf}44`,
            fontSize: 10, fontWeight: 600, color: cConf, textTransform: "capitalize" as const,
            fontFamily: "'Inter Tight',sans-serif",
          }}>
            {data.confidence}
          </span>
        </div>
      </div>

      {/* Headline sentence */}
      <div style={{ fontSize: 12, color: "#C4C8D1", lineHeight: 1.6, marginBottom: 14 }}>
        {data.headline}
      </div>

      {/* Drivers */}
      {data.drivers.length > 0 && (
        <>
          <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 8 }}>
            Drivers
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 6,
            marginBottom: 14,
          }}>
            {data.drivers.slice(0, 6).map((d, i) => <DriverRow key={i} driver={d} />)}
          </div>
        </>
      )}

      {/* Snapshot timeline — only if we have ≥2 snapshots */}
      {data.snapshots.length >= 2 && (
        <>
          <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 10 }}>
            Listing History
          </div>
          <div style={{
            padding: "12px 10px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.04)",
            marginBottom: 14,
            overflow: "auto",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
              {data.snapshots.map((snap, i) => {
                const isFirst = i === 0;
                const isLast  = i === data.snapshots.length - 1;
                const prevPrice = i > 0 ? data.snapshots[i - 1].asking_price : snap.asking_price;
                const dotColor = isFirst ? "#64748B"
                              : snap.asking_price < prevPrice ? "#10B981"
                              : snap.asking_price > prevPrice ? "#F87171"
                              :                                 "#94A3B8";
                return (
                  <React.Fragment key={i}>
                    <TimelineDot
                      date={snap.snapshot_date}
                      price={snap.asking_price}
                      isFirst={isFirst}
                      isLast={isLast}
                      color={dotColor}
                    />
                    {!isLast && (
                      <div style={{ flex: 1, height: 2, background: "rgba(100,116,139,0.3)", marginTop: 7, minWidth: 20 }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            {data.priceMovementPct != null && Math.abs(data.priceMovementPct) >= 1 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 11, color: data.priceMovementPct < 0 ? "#10B981" : "#F87171", fontWeight: 500 }}>
                {data.priceMovementPct < 0 ? "▼" : "▲"} {Math.abs(data.priceMovementPct).toFixed(1)}% from initial listing
              </div>
            )}
          </div>
        </>
      )}

      {/* Confidence note (footer) */}
      <div style={{
        padding: "8px 11px",
        borderRadius: 7,
        background: "rgba(99,102,241,0.04)",
        border: "1px solid rgba(99,102,241,0.12)",
        fontSize: 10,
        color: "#7C8593",
        lineHeight: 1.5,
      }}>
        {data.confidenceNote}
        {data.daysTracked != null && ` Tracking since ${new Date(Date.now() - data.daysTracked * 86400_000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`}
      </div>
    </div>
  );
}

export default TrajectoryChip;
