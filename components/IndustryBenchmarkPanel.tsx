// components/IndustryBenchmarkPanel.tsx
// Reusable benchmark display panel — matches NexTax dark premium UI system.
// Safe for: DealDetailPanel, UnderwritingPanel, future PDF export.
//
// Data contract:
//   rmaBenchmarks fields are already in correct units:
//     ebitdaMarginPct, operatingMarginPct  → decimals  (0.121 = 12.1%)
//     currentRatio, debtToEquity           → raw ratios (1.8, 2.4)
//   No unit conversion happens upstream — this component does it for display.

import React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RmaBenchmarkFields {
  ebitdaMarginPct:    number | null;
  operatingMarginPct: number | null;
  currentRatio:       number | null;
  debtToEquity:       number | null;
  interestCoverage:   number | null;
  leverageFlag:       string | null;
  coverageFlag:       string | null;
}

export interface IndustryBenchmarkPanelProps {
  rmaBenchmarks: RmaBenchmarkFields | null;
  marginScore:   number;              // 0–100, from scoreDeal()
  sde:           number;              // deal's stated SDE
  revenue:       number;              // deal's revenue
  style?: React.CSSProperties; // optional style override for outer wrapper
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Decimal → whole-number percent string: 0.121 → "12%" */
function pct(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return `~${Math.round(v * 100)}%`;
}

/** Raw ratio → 1dp string: 2.4 → "2.4x" */
function ratio(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return `~${v.toFixed(1)}x`;
}

type MarginStatus = "above" | "inline" | "below" | "unknown";

function getMarginStatus(
  sde: number,
  revenue: number,
  ebitdaMarginPct: number | null,
): MarginStatus {
  if (!ebitdaMarginPct || revenue <= 0) return "unknown";
  const dealMargin  = sde / revenue;           // decimal e.g. 0.18
  const rmaMedian   = ebitdaMarginPct;         // decimal e.g. 0.121
  const r           = dealMargin / rmaMedian;
  if (r > 1.4)              return "above";
  if (r >= 0.8 && r <= 1.4) return "inline";
  return "below";
}

const MARGIN_CONFIG: Record<MarginStatus, {
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
}> = {
  above: {
    label:    "Above Industry",
    sublabel: "High add-back scrutiny recommended",
    color:    "#F97316",
    bg:       "rgba(249,115,22,0.08)",
    border:   "rgba(249,115,22,0.2)",
    dot:      "#F97316",
  },
  inline: {
    label:    "In Line With Industry",
    sublabel: "Margins consistent with sector benchmarks",
    color:    "#10B981",
    bg:       "rgba(16,185,129,0.08)",
    border:   "rgba(16,185,129,0.2)",
    dot:      "#10B981",
  },
  below: {
    label:    "Below Industry",
    sublabel: "Margin underperformance or conservative add-backs",
    color:    "#F59E0B",
    bg:       "rgba(245,158,11,0.08)",
    border:   "rgba(245,158,11,0.2)",
    dot:      "#F59E0B",
  },
  unknown: {
    label:    "Comparison Unavailable",
    sublabel: "Insufficient data to compare margins",
    color:    "#4B5563",
    bg:       "rgba(255,255,255,0.02)",
    border:   "rgba(255,255,255,0.08)",
    dot:      "#4B5563",
  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function BenchmarkRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div>
        <div style={{ fontSize: 12, color: "#94A3B8" }}>{label}</div>
        {sub && (
          <div style={{ fontSize: 10, color: "#4B5563", marginTop: 1 }}>{sub}</div>
        )}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#E2E8F0",
          fontFamily: "'JetBrains Mono',monospace",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function IndustryBenchmarkPanel({
  rmaBenchmarks,
  marginScore,
  sde,
  revenue,
  style,
}: IndustryBenchmarkPanelProps) {

  // ── No data state ─────────────────────────────────────────────────────────
  if (!rmaBenchmarks) {
    return (
      <div
        style={{
          padding: "12px 14px",
          borderRadius: 10,
          background: "rgba(255,255,255,0.015)",
          border: "1px solid rgba(255,255,255,0.06)",
          ...style,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "#374151",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 6,
          }}
        >
          Industry Benchmarks
        </div>
        <div style={{ fontSize: 12, color: "#4B5563", lineHeight: 1.6 }}>
          Industry benchmarks unavailable for this category.
        </div>
      </div>
    );
  }

  const marginStatus = getMarginStatus(sde, revenue, rmaBenchmarks.ebitdaMarginPct);
  const mc = MARGIN_CONFIG[marginStatus];

  // marginScore band for the score bar
  const scoreColor =
    marginScore >= 70 ? "#10B981" :
    marginScore >= 50 ? "#F59E0B" :
    marginScore >= 30 ? "#F97316" : "#EF4444";

  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.015)",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "11px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(255,255,255,0.01)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#94A3B8",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Industry Benchmarks
        </div>
        {/* Margin plausibility score pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "2px 8px",
            borderRadius: 20,
            background: `${scoreColor}15`,
            border: `1px solid ${scoreColor}33`,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: scoreColor,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: scoreColor,
              fontFamily: "'JetBrains Mono',monospace",
            }}
          >
            {marginScore}
          </span>
          <span style={{ fontSize: 9, color: "#4B5563" }}>/ 100</span>
        </div>
      </div>

      {/* ── Benchmark metrics ───────────────────────────────────────────── */}
      <div style={{ padding: "4px 16px 0" }}>
        <BenchmarkRow
          label="Typical EBITDA Margin"
          value={pct(rmaBenchmarks.ebitdaMarginPct)}
          sub="Earnings before interest, taxes, depreciation"
        />
        <BenchmarkRow
          label="Typical Operating Margin"
          value={pct(rmaBenchmarks.operatingMarginPct)}
        />
        <BenchmarkRow
          label="Typical Current Ratio"
          value={ratio(rmaBenchmarks.currentRatio)}
          sub="Short-term liquidity indicator"
        />
        <BenchmarkRow
          label="Typical Debt / Equity"
          value={ratio(rmaBenchmarks.debtToEquity)}
          sub="Leverage relative to owner equity"
        />
        {rmaBenchmarks.interestCoverage !== null && (
          <BenchmarkRow
            label="Interest Coverage"
            value={ratio(rmaBenchmarks.interestCoverage)}
            sub="Ability to service debt from earnings"
          />
        )}
      </div>

      {/* ── Margin comparison badge ─────────────────────────────────────── */}
      <div style={{ padding: "10px 16px 12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "9px 12px",
            borderRadius: 9,
            background: mc.bg,
            border: `1px solid ${mc.border}`,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: mc.dot,
              flexShrink: 0,
              marginTop: 4,
            }}
          />
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: mc.color,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 2,
              }}
            >
              {mc.label}
            </div>
            <div style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.5 }}>
              {mc.sublabel}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "7px 16px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          fontSize: 10,
          color: "#374151",
          fontStyle: "italic",
        }}
      >
        Based on industry financial data (RMA)
      </div>
    </div>
  );
}

export default IndustryBenchmarkPanel;
