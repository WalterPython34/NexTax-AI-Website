// components/CompsTab.tsx
// Market Comps Tab — NexTax Underwriting Panel
//
// Design direction: Precision instrument. Dense but scannable.
// Structured like a capital markets tear sheet, not a SaaS dashboard.
//
// Credibility rules:
//   - Never say "observed" unless comps array is actually populated
//   - Never show raw/broker SDE — always usableSDE
//   - Percentile shown only when available; falls back to "Percentile pending"
//   - Benchmark ranges labeled "typical market range" or "current benchmark range"

"use client";

import React from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

const T = {
  bg:          "#0D1117",
  bgCard:      "rgba(255,255,255,0.018)",
  bgInset:     "rgba(255,255,255,0.025)",
  border:      "rgba(255,255,255,0.07)",
  borderLight: "rgba(255,255,255,0.04)",
  borderMid:   "rgba(255,255,255,0.055)",
  text:        "#F1F5F9",
  textSub:     "#94A3B8",
  textMuted:   "#4B5563",
  mono:        "'JetBrains Mono', monospace",
  sans:        "'Inter Tight', sans-serif",
  green:       "#10B981",  greenBg:  "rgba(16,185,129,0.07)",   greenBd:  "rgba(16,185,129,0.2)",
  teal:        "#2DD4BF",  tealBg:   "rgba(45,212,191,0.07)",   tealBd:   "rgba(45,212,191,0.2)",
  amber:       "#F59E0B",  amberBg:  "rgba(245,158,11,0.07)",   amberBd:  "rgba(245,158,11,0.2)",
  orange:      "#F97316",  orangeBg: "rgba(249,115,22,0.07)",   orangeBd: "rgba(249,115,22,0.2)",
  red:         "#EF4444",  redBg:    "rgba(239,68,68,0.07)",    redBd:    "rgba(239,68,68,0.2)",
  indigo:      "#818CF8",  indigoBg: "rgba(129,140,248,0.07)",  indigoBd: "rgba(129,140,248,0.2)",
  slate:       "#64748B",  slateBg:  "rgba(100,116,139,0.07)",  slateBd:  "rgba(100,116,139,0.2)",
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS — formatting only
// ═══════════════════════════════════════════════════════════════════════════════

export function formatMoney(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return "—";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000)     return `$${Math.round(value / 1_000)}K`;
  return `$${value.toLocaleString()}`;
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null || !isFinite(value)) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatMultiple(value: number | null | undefined, decimals = 2): string {
  if (value == null || !isFinite(value)) return "—";
  return `${value.toFixed(decimals)}x`;
}

// ── Implication line — short, sharp, driven by most important signal ──────────
function pricingImplication(
  pricingLabel: PricingLabel,
  currentMultiple: number,
  highMultiple: number,
  lowMultiple: number,
  dscr: number,
): string {
  if (pricingLabel === "Extreme Outlier") {
    return "This deal is priced far outside normal market range. Current pricing likely cannot be financed at standard terms.";
  }
  if (pricingLabel === "Significantly Above Market") {
    if (dscr < 1.25) return "Current pricing likely requires a major repricing to be financeable — DSCR confirms the deal does not support standard debt at this ask.";
    return "Pricing sits materially above what most buyers would consider fair value. Significant repricing would be required before this deal makes sense.";
  }
  if (pricingLabel === "Above Market") {
    return "This deal is priced above the typical market band. Negotiate aggressively or walk away at the current ask.";
  }
  if (pricingLabel === "At Market") {
    return "This deal appears broadly aligned with current market ranges. Focus diligence on earnings quality and deal structure.";
  }
  if (pricingLabel === "Below Market") {
    return "Current pricing is below the typical market range. Investigate seller motivation — below-market pricing often signals undisclosed risk.";
  }
  // Well Below Market
  return "This deal is priced well below typical market range. If reported earnings are credible, this may represent an attractive entry point.";
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ComparableDeal {
  id:        string;
  name:      string;
  revenue:   number;
  sde:       number;
  multiple:  number;
  location?: string | null;
  note?:     string | null;
}

export type PricingLabel =
  | "Well Below Market"
  | "Below Market"
  | "At Market"
  | "Above Market"
  | "Significantly Above Market"
  | "Extreme Outlier";

export type VerdictLabel =
  | "high_conviction"
  | "pursue"
  | "investigate"
  | "pass"
  | "manual_review";

export interface MarketPositionHeroProps {
  benchmarkLabel:   string;
  benchmarkIsProxy: boolean;
  pricingLabel:     PricingLabel;
  percentile?:      number | null;
  currentMultiple:  number;
  lowMultiple:      number;
  medianMultiple:   number;
  highMultiple:     number;
  benchmarkSource:  "direct" | "proxy" | "fallback";
  currentDscr:      number;  // needed for implication line
}

export interface RangeBarData {
  label:        string;
  currentValue: number | null;
  low:          number;
  median:       number;
  high:         number;
  format:       "multiple" | "percent" | "money";
  note?:        string;
  isAdjusted?:  boolean;
}

export interface RangeBarsSectionProps {
  bars: RangeBarData[];
}

export interface ReportedVsAdjustedSectionProps {
  reportedSDE:         number;
  usableSDE:           number;
  benchmarkImpliedSDE: number | null;
  reportedFairValue:   number;
  adjustedFairValue:   number;
  trustScore:          number;
  earningsSource:      "reported" | "blended" | "benchmark_implied";
  isAdjusted:          boolean;
}

export interface ComparableDealsSectionProps {
  comps:                   ComparableDeal[];
  currentMultiple:         number;
  currentDealOutsideRange: boolean;
  benchmarkIsProxy:        boolean;
}

export interface MarketInsightsSectionProps {
  insights: string[];
}

export interface DecisionSummarySectionProps {
  verdict:  VerdictLabel;
  summary:  string;
  actions:  string[];
}

export interface BenchmarkContext {
  benchmarkLabel:   string;
  benchmarkIsProxy: boolean;
  benchmarkSource:  "direct" | "proxy" | "fallback";
  lowMultiple:      number;
  medianMultiple:   number;
  highMultiple:     number;
  marginLow:        number;
  marginMedian:     number;
  marginHigh:       number;
  dscrLow:          number;
  dscrMedian:       number;
  dscrHigh:         number;
}

export interface MarketPosition {
  pricingLabel:    PricingLabel;
  percentile?:     number | null;
  currentMultiple: number;
}

export interface NormalizationContext {
  reportedSDE:         number;
  usableSDE:           number;
  benchmarkImpliedSDE: number | null;
  reportedFairValue:   number;
  adjustedFairValue:   number;
  trustScore:          number;
  earningsSource:      "reported" | "blended" | "benchmark_implied";
  isAdjusted:          boolean;
  currentMargin:       number | null;
  currentDscr:         number;
}

export interface CompsData {
  comps:                   ComparableDeal[];
  currentDealOutsideRange: boolean;
}

export interface DecisionContext {
  verdict:  VerdictLabel;
  summary:  string;
  actions:  string[];
}

export interface CompsTabProps {
  benchmarkContext: BenchmarkContext;
  marketPosition:   MarketPosition;
  normalization:    NormalizationContext;
  compsData:        CompsData;
  insights:         string[];
  decision:         DecisionContext;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED ATOMS
// ═══════════════════════════════════════════════════════════════════════════════

function SectionCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, padding: "15px 18px", ...style }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" as const, color: T.textMuted, fontFamily: T.sans, marginBottom: 11 }}>
      {children}
    </div>
  );
}

function Chip({ label, color = T.textSub, bg = T.bgInset, bd = T.border }: { label: string; color?: string; bg?: string; bd?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 20, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color, background: bg, border: `1px solid ${bd}`, fontFamily: T.sans }}>
      {label}
    </span>
  );
}

function Mono({ children, color, size = 13 }: { children: React.ReactNode; color?: string; size?: number }) {
  return <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: size, color: color ?? T.text }}>{children}</span>;
}

function pricingColor(label: PricingLabel): string {
  switch (label) {
    case "Well Below Market":          return T.teal;
    case "Below Market":               return T.green;
    case "At Market":                  return T.amber;
    case "Above Market":               return T.orange;
    case "Significantly Above Market": return T.red;
    case "Extreme Outlier":            return T.red;
  }
}

function pricingBg(label: PricingLabel): string {
  switch (label) {
    case "Well Below Market":          return T.tealBg;
    case "Below Market":               return T.greenBg;
    case "At Market":                  return T.amberBg;
    case "Above Market":               return T.orangeBg;
    case "Significantly Above Market": return T.redBg;
    case "Extreme Outlier":            return T.redBg;
  }
}

const VERDICT_CFG: Record<VerdictLabel, { emoji: string; label: string; color: string; bg: string; bd: string }> = {
  high_conviction: { emoji: "🔥", label: "High Conviction",      color: T.orange, bg: T.orangeBg, bd: T.orangeBd },
  pursue:          { emoji: "🟢", label: "Pursue",               color: T.green,  bg: T.greenBg,  bd: T.greenBd  },
  investigate:     { emoji: "🟡", label: "Investigate",          color: T.amber,  bg: T.amberBg,  bd: T.amberBd  },
  pass:            { emoji: "🔴", label: "Pass",                 color: T.red,    bg: T.redBg,    bd: T.redBd    },
  manual_review:   { emoji: "⚠️", label: "Needs Manual Review", color: T.orange, bg: T.orangeBg, bd: T.orangeBd },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PART 2 — OUTLIER BANNER (new)
// ═══════════════════════════════════════════════════════════════════════════════

function OutlierBanner({ currentMultiple, lowMultiple, highMultiple }: {
  currentMultiple: number;
  lowMultiple:     number;
  highMultiple:    number;
}) {
  const isExtreme = currentMultiple > highMultiple * 1.5;
  const isCheap   = currentMultiple < lowMultiple * 0.75;

  if (!isExtreme && !isCheap) return null;

  const [color, bg, bd, icon, title, sub] = isExtreme
    ? [T.red, T.redBg, T.redBd, "⚠", "This deal is materially above market norms",
       "Buyers typically do not pay this multiple without exceptional growth or strategic value. Current pricing may not hold up under lender or buyer scrutiny."]
    : [T.teal, T.tealBg, T.tealBd, "↓", "This deal is priced below the typical market range",
       "This may represent attractive pricing if reported earnings are credible. Investigate seller motivation before advancing."];

  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 16px", borderRadius: 10, background: bg, border: `1px solid ${bd}`, marginBottom: 10 }}>
      <div style={{ fontSize: 16, flexShrink: 0, color, marginTop: 1 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 4, fontFamily: T.sans }}>{title}</div>
        <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.6 }}>{sub}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. MarketPositionHero — strengthened
// ═══════════════════════════════════════════════════════════════════════════════

export function MarketPositionHero({
  benchmarkLabel, benchmarkIsProxy, pricingLabel, percentile,
  currentMultiple, lowMultiple, medianMultiple, highMultiple,
  benchmarkSource, currentDscr,
}: MarketPositionHeroProps) {
  const pc         = pricingColor(pricingLabel);
  const pb         = pricingBg(pricingLabel);
  const implication = pricingImplication(pricingLabel, currentMultiple, highMultiple, lowMultiple, currentDscr);

  return (
    <SectionCard style={{ marginBottom: 10 }}>
      {/* Top row: chips + percentile */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" as const }}>
          <Chip label={benchmarkLabel} />
          {benchmarkIsProxy && (
            <Chip label="Closest Available Proxy" color={T.amber} bg={T.amberBg} bd={T.amberBd} />
          )}
          {benchmarkSource === "direct" && (
            <Chip label="Direct RMA" color={T.green} bg={T.greenBg} bd={T.greenBd} />
          )}
          {benchmarkSource === "fallback" && (
            <Chip label="Estimated Range" color={T.slate} bg={T.slateBg} bd={T.slateBd} />
          )}
        </div>
        {/* Percentile — right side */}
        {percentile != null ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0, marginLeft: 12 }}>
            <div style={{ fontSize: 9, color: T.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 2 }}>Percentile</div>
            <Mono color={pc} size={18}>{percentile}th</Mono>
          </div>
        ) : (
          <div style={{ padding: "3px 9px", borderRadius: 20, fontSize: 9, color: T.textMuted, background: T.bgInset, border: `1px solid ${T.border}`, flexShrink: 0, marginLeft: 12 }}>
            Percentile pending
          </div>
        )}
      </div>

      {/* Large pricing status label */}
      <div style={{ display: "inline-block", padding: "6px 14px", borderRadius: 9, background: pb, border: `1px solid ${pc}44`, marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: pc, fontFamily: T.sans, letterSpacing: "-0.01em" }}>
          {pricingLabel}
        </span>
      </div>

      {/* Supporting line */}
      <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.6, marginBottom: 8 }}>
        <Mono color={T.text} size={12}>{formatMultiple(currentMultiple)}</Mono>
        {" asking multiple vs typical "}
        <Mono color={T.textSub} size={11}>{formatMultiple(lowMultiple)}</Mono>
        {"–"}
        <Mono color={T.textSub} size={11}>{formatMultiple(highMultiple)}</Mono>
        {" current benchmark range"}
        {medianMultiple > 0 && (
          <>{" (median "}<Mono color={T.textSub} size={11}>{formatMultiple(medianMultiple)}</Mono>{")"}</>
        )}
      </div>

      {/* Implication line — short, decisive */}
      <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.6, paddingTop: 8, borderTop: `1px solid ${T.borderLight}`, fontStyle: "italic" }}>
        {implication}
      </div>
    </SectionCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. RangeBar + RangeBarsSection — unchanged structure, improved labels
// ═══════════════════════════════════════════════════════════════════════════════

function formatValue(v: number, format: RangeBarData["format"]): string {
  if (format === "multiple") return formatMultiple(v);
  if (format === "percent")  return formatPercent(v);
  return formatMoney(v);
}

export function RangeBar({ label, currentValue, low, median, high, format, note, isAdjusted }: RangeBarData) {
  const rangeSpan   = high - low;
  const trackPadPct = 10;
  const usableWidth = 100 - 2 * trackPadPct;

  function toPosition(v: number): number {
    if (rangeSpan <= 0) return 50;
    return Math.max(2, Math.min(98, ((v - low) / rangeSpan) * usableWidth + trackPadPct));
  }

  const medianPos  = toPosition(median);
  const isOutLeft  = currentValue != null && currentValue < low;
  const isOutRight = currentValue != null && currentValue > high;
  const isOutRange = isOutLeft || isOutRight;
  const markerPos  = currentValue != null ? (isOutLeft ? 2 : isOutRight ? 98 : toPosition(currentValue)) : null;
  const markerColor = isOutRange ? T.red : isAdjusted ? T.indigo : T.green;

  return (
    <div style={{ paddingBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: T.textSub }}>{label}</span>
          {isAdjusted && <Chip label="Adjusted" color={T.indigo} bg={T.indigoBg} bd={T.indigoBd} />}
          {isOutRange && <Chip label="Outside Range" color={T.red} bg={T.redBg} bd={T.redBd} />}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: T.textMuted }}>{formatValue(low, format)} — {formatValue(high, format)}</span>
          {currentValue != null && <Mono color={markerColor} size={12}>{formatValue(currentValue, format)}</Mono>}
        </div>
      </div>

      <div style={{ position: "relative", height: 6, borderRadius: 3, background: T.bgInset, border: `1px solid ${T.borderLight}` }}>
        <div style={{ position: "absolute", left: `${trackPadPct}%`, width: `${usableWidth}%`, top: 0, bottom: 0, borderRadius: 2, background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", left: `${medianPos}%`, top: -2, bottom: -2, width: 2, borderRadius: 1, background: T.textMuted, transform: "translateX(-50%)" }} />
        {markerPos != null && (
          <div style={{ position: "absolute", left: `${markerPos}%`, top: "50%", transform: "translate(-50%, -50%)", width: 10, height: 10, borderRadius: "50%", background: markerColor, border: `2px solid ${T.bg}`, boxShadow: `0 0 0 1px ${markerColor}`, zIndex: 1 }} />
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 9, color: T.textMuted }}>Low {formatValue(low, format)}</span>
        <span style={{ fontSize: 9, color: T.textMuted }}>Median</span>
        <span style={{ fontSize: 9, color: T.textMuted }}>High {formatValue(high, format)}</span>
      </div>

      {note && <div style={{ fontSize: 10, color: T.textMuted, marginTop: 3, lineHeight: 1.4 }}>{note}</div>}
    </div>
  );
}

export function RangeBarsSection({ bars }: RangeBarsSectionProps) {
  return (
    <SectionCard style={{ marginBottom: 10 }}>
      <SectionLabel>Benchmark Range Comparison</SectionLabel>
      <div>
        {bars.map((bar, i) => (
          <div key={bar.label} style={{ borderTop: i > 0 ? `1px solid ${T.borderLight}` : "none", paddingTop: i > 0 ? 12 : 0 }}>
            <RangeBar {...bar} />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. ReportedVsAdjustedSection — strengthened
// ═══════════════════════════════════════════════════════════════════════════════

export function ReportedVsAdjustedSection({
  reportedSDE, usableSDE, benchmarkImpliedSDE,
  reportedFairValue, adjustedFairValue,
  trustScore, earningsSource, isAdjusted,
}: ReportedVsAdjustedSectionProps) {
  if (!isAdjusted) return null;

  const tColor = trustScore >= 80 ? T.green : trustScore >= 60 ? T.amber : T.orange;

  const srcLabel =
    earningsSource === "benchmark_implied" ? "benchmark-implied"
    : earningsSource === "blended"         ? "conservative blend"
    :                                        "reported";

  const delta = reportedSDE > 0
    ? Math.round(((usableSDE - reportedSDE) / reportedSDE) * 100)
    : null;

  const fvDelta = reportedFairValue > 0 && adjustedFairValue !== reportedFairValue
    ? Math.round(((adjustedFairValue - reportedFairValue) / reportedFairValue) * 100)
    : null;

  const earningsExplain =
    earningsSource === "benchmark_implied"
      ? "Stated SDE was set aside due to low data confidence. Usable SDE is derived from the RMA benchmark margin applied to reported revenue."
      : earningsSource === "blended"
      ? "Usable SDE reflects the more conservative of stated and benchmark-implied earnings. Stated SDE appeared elevated relative to industry norms."
      : null;

  return (
    <SectionCard style={{ marginBottom: 10 }}>
      <SectionLabel>Normalization — What Changed</SectionLabel>

      {/* Low-trust warning */}
      {trustScore < 60 && (
        <div style={{ display: "flex", gap: 10, padding: "9px 12px", borderRadius: 8, background: T.orangeBg, border: `1px solid ${T.orangeBd}`, marginBottom: 12 }}>
          <span style={{ color: T.orange, fontSize: 14, flexShrink: 0 }}>⚠</span>
          <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.5 }}>
            <strong style={{ color: T.orange }}>Adjusted values in use.</strong>{" "}
            Reported financials appear unreliable (data confidence: {trustScore}/100). Market positioning reflects trust-adjusted earnings, not broker-stated SDE.
          </div>
        </div>
      )}

      {/* Earnings source explanation */}
      {earningsExplain && (
        <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.5, marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${T.borderLight}` }}>
          {earningsExplain}
        </div>
      )}

      {/* Comparison table */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
        {(["Metric", "Reported", "Adjusted"] as const).map((h, i) => (
          <div key={h} style={{ fontSize: 9, fontWeight: 700, color: T.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.08em", padding: "0 0 8px", textAlign: i === 0 ? "left" : "right" as const, borderBottom: `1px solid ${T.borderMid}` }}>
            {h}
          </div>
        ))}

        <CRow label="SDE (Usable)" reported={formatMoney(reportedSDE)} adjusted={formatMoney(usableSDE)} adjustedColor={T.indigo} changed={reportedSDE !== usableSDE} />
        <CRow label="Fair Value" reported={formatMoney(reportedFairValue)} adjusted={formatMoney(adjustedFairValue)} adjustedColor={T.green} changed={reportedFairValue !== adjustedFairValue} />
        {benchmarkImpliedSDE != null && (
          <CRow label="Benchmark SDE" reported="—" adjusted={formatMoney(benchmarkImpliedSDE)} adjustedColor={T.textSub} changed={false} />
        )}
      </div>

      {/* Delta callout */}
      {fvDelta != null && Math.abs(fvDelta) >= 10 && (
        <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: T.bgInset, border: `1px solid ${T.borderLight}` }}>
          <span style={{ fontSize: 11, color: fvDelta < 0 ? T.orange : T.green }}>
            {fvDelta < 0
              ? `Adjusted fair value is ${Math.abs(fvDelta)}% lower than the broker-implied value. The deal is less attractive on adjusted earnings than the listing suggests.`
              : `Adjusted fair value is ${fvDelta}% above the broker-implied value based on benchmark earnings.`}
          </span>
        </div>
      )}

      {/* Trust bar */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.borderLight}`, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, color: T.textMuted }}>Data Confidence</span>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: T.bgInset, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${trustScore}%`, borderRadius: 2, background: tColor, transition: "width 0.4s ease" }} />
        </div>
        <Mono color={tColor} size={11}>{trustScore}/100</Mono>
      </div>
    </SectionCard>
  );
}

function CRow({ label, reported, adjusted, adjustedColor, changed }: { label: string; reported: string; adjusted: string; adjustedColor: string; changed: boolean }) {
  return (
    <>
      <div style={{ fontSize: 11, color: T.textSub, padding: "9px 0", borderBottom: `1px solid ${T.borderLight}` }}>{label}</div>
      <div style={{ fontSize: 12, fontFamily: T.mono, fontWeight: 600, color: changed ? T.textMuted : T.text, textDecoration: changed ? "line-through" : "none", textAlign: "right" as const, padding: "9px 0", borderBottom: `1px solid ${T.borderLight}`, paddingRight: 12 }}>
        {reported}
      </div>
      <div style={{ fontSize: 12, fontFamily: T.mono, fontWeight: 700, color: adjustedColor, textAlign: "right" as const, padding: "9px 0", borderBottom: `1px solid ${T.borderLight}` }}>
        {adjusted}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. ComparableDealsSection — polished empty state
// ═══════════════════════════════════════════════════════════════════════════════

export function ComparableDealsSection({ comps, currentMultiple, currentDealOutsideRange, benchmarkIsProxy }: ComparableDealsSectionProps) {
  if (comps.length === 0) {
    return (
      <SectionCard style={{ marginBottom: 10 }}>
        <SectionLabel>Representative Comps</SectionLabel>
        <div style={{ padding: "16px 0 8px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6, fontFamily: T.sans }}>
            Representative comps coming online
          </div>
          <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.7 }}>
            We can already place this deal against current benchmark ranges. Representative deal rows will appear as more market data is added to the NexTax database.
          </div>
        </div>
      </SectionCard>
    );
  }

  const multiples = comps.map(c => c.multiple);
  const compMin   = Math.min(...multiples);
  const compMax   = Math.max(...multiples);

  return (
    <SectionCard style={{ marginBottom: 10 }}>
      <SectionLabel>Representative Comps</SectionLabel>
      <div style={{ overflowX: "auto" as const }}>
        <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
          <thead>
            <tr>
              {(["Deal", "Revenue", "Adj. SDE", "Multiple", "Note"] as const).map((h, i) => (
                <th key={h} style={{ fontSize: 9, fontWeight: 700, color: T.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.08em", textAlign: i === 0 ? "left" : "right" as const, paddingBottom: 8, paddingRight: i < 4 ? 12 : 0, borderBottom: `1px solid ${T.borderMid}`, whiteSpace: "nowrap" as const }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comps.map((comp) => {
              const isHighest = comp.multiple === compMax;
              const isLowest  = comp.multiple === compMin;
              return (
                <tr key={comp.id}>
                  <td style={{ fontSize: 11, padding: "8px 12px 8px 0", borderBottom: `1px solid ${T.borderLight}`, maxWidth: 120 }}>
                    <div style={{ fontWeight: 500, color: T.text }}>{comp.name}</div>
                    {comp.location && <div style={{ fontSize: 9, color: T.textMuted, marginTop: 1 }}>{comp.location}</div>}
                  </td>
                  <td style={{ fontSize: 11, fontFamily: T.mono, color: T.textSub, textAlign: "right" as const, padding: "8px 12px 8px 0", borderBottom: `1px solid ${T.borderLight}`, whiteSpace: "nowrap" as const }}>{formatMoney(comp.revenue)}</td>
                  <td style={{ fontSize: 11, fontFamily: T.mono, color: T.textSub, textAlign: "right" as const, padding: "8px 12px 8px 0", borderBottom: `1px solid ${T.borderLight}`, whiteSpace: "nowrap" as const }}>{formatMoney(comp.sde)}</td>
                  <td style={{ fontSize: 12, fontFamily: T.mono, fontWeight: 700, color: isLowest ? T.green : isHighest ? T.orange : T.text, textAlign: "right" as const, padding: "8px 12px 8px 0", borderBottom: `1px solid ${T.borderLight}`, whiteSpace: "nowrap" as const }}>{formatMultiple(comp.multiple)}</td>
                  <td style={{ fontSize: 10, color: T.textMuted, textAlign: "right" as const, padding: "8px 0", borderBottom: `1px solid ${T.borderLight}`, maxWidth: 100 }}>{comp.note ?? "—"}</td>
                </tr>
              );
            })}
            <tr>
              <td style={{ fontSize: 11, fontWeight: 700, color: T.indigo, padding: "9px 12px 0 0" }}>This Deal</td>
              <td style={{ padding: "9px 12px 0 0" }} />
              <td style={{ padding: "9px 12px 0 0" }} />
              <td style={{ fontSize: 13, fontFamily: T.mono, fontWeight: 800, color: currentDealOutsideRange ? T.red : T.indigo, textAlign: "right" as const, padding: "9px 12px 0 0", whiteSpace: "nowrap" as const }}>
                {formatMultiple(currentMultiple)}
                {currentDealOutsideRange && <span style={{ fontSize: 9, marginLeft: 5, color: T.red }}>↑ outside range</span>}
              </td>
              <td style={{ padding: "9px 0 0 0" }} />
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.borderLight}`, fontSize: 10, color: currentDealOutsideRange ? T.orange : T.textMuted, lineHeight: 1.5 }}>
        {currentDealOutsideRange
          ? "⚠ Your deal sits outside the typical benchmark range. Validate pricing with the broker before advancing."
          : "✓ Your deal is broadly within the typical benchmark range."}
        {benchmarkIsProxy && <span style={{ color: T.textMuted }}>{" "}Comps sourced from proxy benchmark family — actual market transactions may vary.</span>}
      </div>
    </SectionCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. MarketInsightsSection — decisive, buy-side tone
// ═══════════════════════════════════════════════════════════════════════════════

export function MarketInsightsSection({ insights }: MarketInsightsSectionProps) {
  if (insights.length === 0) return null;

  return (
    <SectionCard style={{ marginBottom: 10 }}>
      <SectionLabel>Market Insights</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {insights.map((insight, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.indigo, flexShrink: 0, marginTop: 6 }} />
            <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.6 }}>{insight}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. DecisionSummarySection — actionable
// ═══════════════════════════════════════════════════════════════════════════════

export function DecisionSummarySection({ verdict, summary, actions }: DecisionSummarySectionProps) {
  const cfg = VERDICT_CFG[verdict];
  return (
    <SectionCard>
      <SectionLabel>Decision Summary</SectionLabel>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 9, background: cfg.bg, border: `1px solid ${cfg.bd}`, marginBottom: 12 }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{cfg.emoji}</span>
        <div style={{ fontSize: 12, fontWeight: 700, color: cfg.color, textTransform: "uppercase" as const, letterSpacing: "0.06em", fontFamily: T.sans }}>
          {cfg.label}
        </div>
      </div>
      <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.7, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${T.borderLight}` }}>
        {summary}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {actions.map((action, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 10px", borderRadius: 7, background: T.bgInset, border: `1px solid ${T.borderLight}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.indigo, flexShrink: 0, width: 16, textAlign: "center" as const, marginTop: 1, fontFamily: T.mono }}>{i + 1}</div>
            <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.5 }}>{action}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT — CompsTab
// ═══════════════════════════════════════════════════════════════════════════════

export function CompsTab({ benchmarkContext, marketPosition, normalization, compsData, insights, decision }: CompsTabProps) {
  const { benchmarkLabel, benchmarkIsProxy, benchmarkSource, lowMultiple, medianMultiple, highMultiple, marginLow, marginMedian, marginHigh, dscrLow, dscrMedian, dscrHigh } = benchmarkContext;
  const { pricingLabel, percentile, currentMultiple } = marketPosition;

  const bars: RangeBarData[] = [
    {
      label:        "Asking Multiple",
      currentValue: currentMultiple,
      low:          lowMultiple,
      median:       medianMultiple,
      high:         highMultiple,
      format:       "multiple",
      isAdjusted:   normalization.isAdjusted,
      note: normalization.isAdjusted
        ? `Based on adjusted SDE (${formatMoney(normalization.usableSDE)}) — reported SDE was ${formatMoney(normalization.reportedSDE)}`
        : undefined,
    },
    {
      label:        "SDE Margin",
      currentValue: normalization.currentMargin,
      low:          marginLow,
      median:       marginMedian,
      high:         marginHigh,
      format:       "percent",
      isAdjusted:   normalization.isAdjusted,
    },
    {
      label:        "DSCR",
      currentValue: normalization.currentDscr,
      low:          dscrLow,
      median:       dscrMedian,
      high:         dscrHigh,
      format:       "multiple",
      note: normalization.currentDscr < 1.0
        ? "DSCR below 1.0x — deal cannot service standard debt at current terms"
        : normalization.currentDscr < 1.25
        ? "DSCR below 1.25x lender minimum — financing is at risk"
        : undefined,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <MarketPositionHero
        benchmarkLabel={benchmarkLabel}
        benchmarkIsProxy={benchmarkIsProxy}
        benchmarkSource={benchmarkSource}
        pricingLabel={pricingLabel}
        percentile={percentile}
        currentMultiple={currentMultiple}
        lowMultiple={lowMultiple}
        medianMultiple={medianMultiple}
        highMultiple={highMultiple}
        currentDscr={normalization.currentDscr}
      />

      <OutlierBanner
        currentMultiple={currentMultiple}
        lowMultiple={lowMultiple}
        highMultiple={highMultiple}
      />

      <RangeBarsSection bars={bars} />

      <ReportedVsAdjustedSection
        reportedSDE={normalization.reportedSDE}
        usableSDE={normalization.usableSDE}
        benchmarkImpliedSDE={normalization.benchmarkImpliedSDE}
        reportedFairValue={normalization.reportedFairValue}
        adjustedFairValue={normalization.adjustedFairValue}
        trustScore={normalization.trustScore}
        earningsSource={normalization.earningsSource}
        isAdjusted={normalization.isAdjusted}
      />

      <ComparableDealsSection
        comps={compsData.comps}
        currentMultiple={currentMultiple}
        currentDealOutsideRange={compsData.currentDealOutsideRange}
        benchmarkIsProxy={benchmarkIsProxy}
      />

      <MarketInsightsSection insights={insights} />

      <DecisionSummarySection
        verdict={decision.verdict}
        summary={decision.summary}
        actions={decision.actions}
      />
    </div>
  );
}

export default CompsTab;
