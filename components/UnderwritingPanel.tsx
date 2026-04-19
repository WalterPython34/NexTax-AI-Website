// components/UnderwritingPanel.tsx
// Production-ready Underwriting Panel for NexTax deal analysis.
//
// Design direction: Precision-instrument. Like a Bloomberg terminal built for
// SMB acquisition buyers — information-dense but never cluttered, every number
// carries explicit provenance, trust is surfaced before conviction.
//
// Data contract:
//   - All business logic already computed (normalization, classification, scoring)
//   - This component ONLY renders — never recomputes
//   - usable_sde drives all displayed financial outputs
//   - reported_sde preserved as audit reference

"use client";

import React, { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NormalizationFlag {
  code:      string;
  severity:  "info" | "caution" | "warning" | "critical";
  title:     string;
  message:   string;
  deduction: number;
  field:     "earnings" | "margins" | "price" | "revenue" | "classification" | "benchmark" | "source";
}

export interface UnderwritingDeal {
  // ── Core financials ──────────────────────────────────────────────────────
  revenue?:               number | null;
  sde?:                   number | null;   // stated SDE (audit reference)
  ebitda?:                number | null;

  // ── Normalization layer ──────────────────────────────────────────────────
  reported_sde?:                  number | null;
  usable_sde?:                    number | null;
  benchmark_implied_sde?:         number | null;
  earnings_source?:               "reported" | "blended" | "benchmark_implied" | null;
  normalization_trust_score?:     number | null;
  normalization_confidence_level?: "high" | "medium" | "low" | null;
  normalization_flags_json?:      NormalizationFlag[] | null;
  manual_review_required?:        boolean | null;

  // ── Benchmark ────────────────────────────────────────────────────────────
  benchmark_family?:    string | null;
  benchmark_is_proxy?:  boolean | null;
  rma_naics_code?:      string | null;

  // ── Scoring outputs (already computed using usable_sde) ──────────────────
  fair_value?:          number | null;
  asking_price?:        number;
  valuation_multiple?:  number | null;
  dscr?:                number | null;
  monthly_payment?:     number | null;
  overall_score?:       number | null;
  risk_level?:          string | null;
  industry?:            string | null;
}

// ── Design tokens (matches buyer-dashboard.tsx exactly) ───────────────────────

const T = {
  bg:           "#0D1117",
  bgCard:       "rgba(255,255,255,0.018)",
  bgCardHover:  "rgba(255,255,255,0.028)",
  bgInset:      "rgba(255,255,255,0.02)",
  border:       "rgba(255,255,255,0.07)",
  borderLight:  "rgba(255,255,255,0.04)",
  text:         "#F1F5F9",
  textSub:      "#94A3B8",
  textMuted:    "#4B5563",
  textDim:      "#374151",
  mono:         "'JetBrains Mono', monospace",
  sans:         "'Inter Tight', sans-serif",
  green:        "#10B981",  greenBg: "rgba(16,185,129,0.08)",  greenBd: "rgba(16,185,129,0.2)",
  amber:        "#F59E0B",  amberBg: "rgba(245,158,11,0.08)",  amberBd: "rgba(245,158,11,0.2)",
  orange:       "#F97316",  orangeBg:"rgba(249,115,22,0.08)",  orangeBd:"rgba(249,115,22,0.2)",
  red:          "#EF4444",  redBg:   "rgba(239,68,68,0.08)",   redBd:   "rgba(239,68,68,0.2)",
  indigo:       "#818CF8",  indigoBg:"rgba(129,140,248,0.08)", indigoBd:"rgba(129,140,248,0.2)",
  slate:        "#64748B",  slateBg: "rgba(100,116,139,0.08)", slateBd: "rgba(100,116,139,0.2)",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt  = (n: number) => `$${Math.round(n).toLocaleString()}`;
const pct  = (n: number) => `${Math.round(n * 100)}%`;
const safe = (n: number | null | undefined, fallback = 0) =>
  typeof n === "number" && isFinite(n) ? n : fallback;

function severityColor(s: NormalizationFlag["severity"]) {
  return s === "critical" ? { color: T.red,    bg: T.redBg,    bd: T.redBd,    dot: T.red    }
       : s === "warning"  ? { color: T.orange,  bg: T.orangeBg, bd: T.orangeBd, dot: T.orange  }
       : s === "caution"  ? { color: T.amber,   bg: T.amberBg,  bd: T.amberBd,  dot: T.amber   }
                          : { color: T.textSub, bg: T.bgInset,  bd: T.border,   dot: T.slate   };
}

function trustColor(score: number) {
  return score >= 85 ? T.green
       : score >= 65 ? T.amber
       : score >= 45 ? T.orange
       :               T.red;
}

function trustLabel(score: number) {
  return score >= 85 ? "High Confidence"
       : score >= 65 ? "Moderate Confidence"
       : score >= 45 ? "Low Confidence"
       :               "Manual Review Required";
}

function earningsSourceLabel(src?: string | null) {
  if (src === "benchmark_implied") return "Benchmark-implied";
  if (src === "blended")           return "Conservative blend";
  return "Reported";
}

const BENCHMARK_LABELS: Record<string, string> = {
  field_services:        "Local Service",
  specialty_trade:       "Specialty Trades",
  auto_services:         "Automotive Services",
  food_beverage:         "Restaurant & Food",
  healthcare_clinical:   "Healthcare Practice",
  behavioral_health:     "Behavioral Health",
  med_spa:               "Med Spa / Aesthetics",
  personal_services:     "Personal Services",
  professional_services: "Professional Services",
  asset_services:        "Asset-Based Business",
  saas:                  "SaaS / Recurring Software",
  digital:               "Digital Business",
  manufacturing:         "Manufacturing",
  retail:                "Retail",
  wholesale:             "Wholesale / Distribution",
};

const NEXT_STEPS: Record<string, { action: string; detail: string }> = {
  TRIPLE_DUPLICATE_FINANCIALS: {
    action:  "Request verified P&L from seller's accountant",
    detail:  "Revenue, SDE, and EBITDA are identical — obtain the full 3-year income statement before advancing.",
  },
  REVENUE_EQUALS_SDE: {
    action:  "Obtain seller's P&L and add-back schedule",
    detail:  "100% SDE margin is not commercially viable. Request itemized operating expense breakdown.",
  },
  REVENUE_EQUALS_EBITDA: {
    action:  "Request full income statement",
    detail:  "Zero-cost implication requires verification. Obtain the complete financial package.",
  },
  SDE_EXCEEDS_REVENUE: {
    action:  "Verify add-back schedule with CPA",
    detail:  "SDE exceeds revenue — requires extraordinary add-backs. Have the seller's CPA certify all adjustments.",
  },
  EBITDA_EXCEEDS_REVENUE: {
    action:  "Halt underwriting pending financial review",
    detail:  "EBITDA exceeding revenue is commercially impossible. Escalate to manual review before proceeding.",
  },
  SDE_MARGIN_2X_ABOVE_BENCHMARK: {
    action:  "Document all add-backs with source evidence",
    detail:  "Request receipts, tax returns, and accountant sign-off on every add-back item before advancing.",
  },
  SDE_MARGIN_ABOVE_INDUSTRY_CEILING: {
    action:  "Request 2 years of tax returns",
    detail:  "SDE margin exceeds the industry hard ceiling. Tax returns will verify whether the stated margin holds.",
  },
  BENCHMARK_UNAVAILABLE: {
    action:  "Source 3–5 comparable transactions",
    detail:  "No RMA data for this industry. Build a manual comp set using BizBuySell, DealStats, or broker comps.",
  },
  PROXY_BENCHMARK_USED: {
    action:  "Adjust margin expectations for this industry",
    detail:  "The benchmark is from a proxy industry. Research sector-specific norms before finalizing your offer.",
  },
  LOW_CLASSIFICATION_CONFIDENCE: {
    action:  "Verify industry classification manually",
    detail:  "Classification confidence is below threshold. Confirm the correct NAICS code with the broker.",
  },
  SOURCE_QUALITY_REDUCED: {
    action:  "Request the full CIM or financial package",
    detail:  "This deal was sourced from a marketplace listing. Request verified financials before advancing.",
  },
  SDE_MARGIN_IMPLAUSIBLE: {
    action:  "Halt and request full financial documentation",
    detail:  "Stated margin is at or above the universally implausible ceiling. Do not advance without verified financials.",
  },
};

function getNextSteps(flags: NormalizationFlag[], dscr: number, trustScore: number) {
  const steps: { action: string; detail: string; severity: string }[] = [];

  // From flags
  const sorted = [...flags].sort((a, b) => b.deduction - a.deduction);
  for (const flag of sorted.slice(0, 4)) {
    const step = NEXT_STEPS[flag.code];
    if (step) steps.push({ ...step, severity: flag.severity });
  }

  // From DSCR
  if (dscr < 1.25 && !steps.some(s => s.action.includes("debt"))) {
    steps.push({
      action:   "Renegotiate terms or offer price",
      detail:   `DSCR of ${dscr.toFixed(2)}x is below the 1.25x lender minimum. Reduce price, increase equity, or extend terms.`,
      severity: "warning",
    });
  }

  // Manual review gate
  if (trustScore < 45 && steps.length < 5) {
    steps.push({
      action:   "Do not advance without manual financial review",
      detail:   "Trust score is critically low. Engage a CPA or M&A advisor to verify all financial inputs before proceeding.",
      severity: "critical",
    });
  }

  return steps.slice(0, 5);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
        textTransform: "uppercase" as const, color: T.textMuted,
        fontFamily: T.sans,
      }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: T.bgCard,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      padding: "16px 18px",
      ...style,
    }}>
      {children}
    </div>
  );
}

function DataRow({
  label, value, valueColor, sub, mono = true, rightBadge,
}: {
  label:        string;
  value:        string;
  valueColor?:  string;
  sub?:         string;
  mono?:        boolean;
  rightBadge?:  React.ReactNode;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 0",
      borderBottom: `1px solid ${T.borderLight}`,
    }}>
      <div>
        <div style={{ fontSize: 12, color: T.textSub }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {rightBadge}
        <span style={{
          fontSize: 13, fontWeight: 700,
          color: valueColor ?? T.text,
          fontFamily: mono ? T.mono : T.sans,
        }}>
          {value}
        </span>
      </div>
    </div>
  );
}

function Pill({ label, color, bg, bd }: { label: string; color: string; bg: string; bd: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 20,
      fontSize: 10, fontWeight: 700,
      color, background: bg, border: `1px solid ${bd}`,
      fontFamily: T.sans, letterSpacing: "0.05em", textTransform: "uppercase" as const,
    }}>
      {label}
    </span>
  );
}

// ── Section: Trust ─────────────────────────────────────────────────────────────

function TrustSection({ deal }: { deal: UnderwritingDeal }) {
  const trust     = safe(deal.normalization_trust_score, 100);
  const isManual  = deal.manual_review_required ?? false;
  const flags     = deal.normalization_flags_json ?? [];
  const tColor    = trustColor(trust);
  const tLabel    = trustLabel(trust);

  // Sort: highest deduction first, then severity order
  const sevOrder = { critical: 0, warning: 1, caution: 2, info: 3 };
  const topFlags = [...flags]
    .sort((a, b) => b.deduction - a.deduction || sevOrder[a.severity] - sevOrder[b.severity])
    .slice(0, 3);

  // Arc geometry
  const arcRadius = 42;
  const arcCircum = 2 * Math.PI * arcRadius;
  const arcFill   = arcCircum * (trust / 100);

  return (
    <Card>
      <SectionHeader label="Data Trust Assessment" sub="Confidence in reported financial inputs" />

      <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 16 }}>
        {/* Score arc */}
        <div style={{ flexShrink: 0, position: "relative", width: 100, height: 100 }}>
          <svg width={100} height={100} viewBox="0 0 100 100">
            <circle cx={50} cy={50} r={arcRadius} fill="none"
              stroke="rgba(255,255,255,0.05)" strokeWidth={8} />
            <circle cx={50} cy={50} r={arcRadius} fill="none"
              stroke={tColor} strokeWidth={8}
              strokeDasharray={`${arcFill} ${arcCircum}`}
              strokeDashoffset={arcCircum * 0.25}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          </svg>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: tColor, fontFamily: T.mono, lineHeight: 1 }}>
              {trust}
            </span>
            <span style={{ fontSize: 9, color: T.textMuted, marginTop: 2, letterSpacing: "0.04em" }}>
              / 100
            </span>
          </div>
        </div>

        {/* Label + status */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: tColor,
            fontFamily: T.sans, letterSpacing: "-0.01em", marginBottom: 6,
          }}>
            {tLabel}
          </div>

          {isManual && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 10px", borderRadius: 8, marginBottom: 8,
              background: T.redBg, border: `1px solid ${T.redBd}`,
            }}>
              <span style={{ fontSize: 12 }}>⚠</span>
              <span style={{ fontSize: 11, color: T.red, fontWeight: 600 }}>
                Manual review required before advancing
              </span>
            </div>
          )}

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
            <div style={{
              padding: "3px 10px", borderRadius: 20,
              fontSize: 10, fontWeight: 600,
              background: tColor + "18", color: tColor,
              border: `1px solid ${tColor}33`,
              fontFamily: T.sans,
            }}>
              {trust >= 85 ? "No material anomalies" : trust >= 65 ? "Minor adjustments applied" : "Significant adjustments applied"}
            </div>
            {deal.earnings_source && deal.earnings_source !== "reported" && (
              <div style={{
                padding: "3px 10px", borderRadius: 20,
                fontSize: 10, fontWeight: 600,
                background: T.indigoBg, color: T.indigo,
                border: `1px solid ${T.indigoBd}`,
              }}>
                Earnings adjusted
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top flags */}
      {topFlags.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 2 }}>
            Input Flags
          </div>
          {topFlags.map((flag, i) => {
            const sc = severityColor(flag.severity);
            return (
              <div key={i} style={{
                display: "flex", gap: 10, padding: "9px 12px",
                borderRadius: 8,
                background: sc.bg, border: `1px solid ${sc.bd}`,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: sc.dot, flexShrink: 0, marginTop: 5,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    marginBottom: 3,
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: sc.color }}>{flag.title}</span>
                    {flag.deduction > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: sc.color,
                        fontFamily: T.mono, marginLeft: 8, flexShrink: 0,
                      }}>
                        −{flag.deduction}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.5 }}>{flag.message}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {flags.length === 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 12px", borderRadius: 8,
          background: T.greenBg, border: `1px solid ${T.greenBd}`,
        }}>
          <span style={{ color: T.green, fontSize: 14 }}>✓</span>
          <span style={{ fontSize: 12, color: T.green }}>
            All financial inputs passed normalization checks
          </span>
        </div>
      )}
    </Card>
  );
}

// ── Section: Earnings ─────────────────────────────────────────────────────────

function EarningsSection({ deal }: { deal: UnderwritingDeal }) {
  const reported  = safe(deal.reported_sde ?? deal.sde);
  const usable    = safe(deal.usable_sde    ?? deal.sde);
  const implied   = deal.benchmark_implied_sde ?? null;
  const src       = deal.earnings_source ?? "reported";
  const isAdjusted = src !== "reported";
  const delta     = reported > 0 ? ((usable - reported) / reported) : 0;

  return (
    <Card>
      <SectionHeader
        label="Earnings Basis"
        sub="The earnings figure used for all valuation and debt service calculations"
      />

      {/* Primary usable SDE — featured */}
      <div style={{
        padding: "14px 16px", borderRadius: 10, marginBottom: 12,
        background: isAdjusted ? T.indigoBg : T.bgInset,
        border: `1px solid ${isAdjusted ? T.indigoBd : T.border}`,
      }}>
        <div style={{ fontSize: 10, color: isAdjusted ? T.indigo : T.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>
          {isAdjusted ? `Usable SDE — ${earningsSourceLabel(src)}` : "Usable SDE — Reported"}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: T.text, fontFamily: T.mono, letterSpacing: "-0.02em" }}>
          {fmt(usable)}
        </div>
        <div style={{ fontSize: 11, color: T.textSub, marginTop: 4 }}>
          {isAdjusted
            ? "This figure was trust-adjusted and is used for fair value, DSCR, and all offer calculations."
            : "Stated earnings passed normalization — used directly for all calculations."}
        </div>
      </div>

      {/* Comparison table */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <DataRow
          label="Reported SDE"
          value={fmt(reported)}
          sub="As stated by broker/seller"
          valueColor={isAdjusted ? T.textMuted : T.text}
          rightBadge={!isAdjusted ? <Pill label="Active" color={T.green} bg={T.greenBg} bd={T.greenBd} /> : undefined}
        />
        {isAdjusted && (
          <DataRow
            label="Usable SDE (adjusted)"
            value={fmt(usable)}
            sub={src === "benchmark_implied" ? "RMA benchmark-implied earnings" : "Lower of reported and benchmark-implied"}
            valueColor={T.indigo}
            rightBadge={<Pill label="Active" color={T.indigo} bg={T.indigoBg} bd={T.indigoBd} />}
          />
        )}
        {implied !== null && (
          <DataRow
            label="Benchmark-Implied SDE"
            value={fmt(implied)}
            sub="Revenue × RMA EBITDA margin"
            valueColor={T.textSub}
          />
        )}
        {isAdjusted && reported > 0 && (
          <div style={{
            marginTop: 10, padding: "8px 12px", borderRadius: 8,
            background: T.amberBg, border: `1px solid ${T.amberBd}`,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 12 }}>△</span>
            <span style={{ fontSize: 11, color: T.amber }}>
              Earnings adjusted by{" "}
              <strong style={{ fontFamily: T.mono }}>{pct(Math.abs(delta))}</strong>
              {" "}({delta < 0 ? "downward" : "upward"}) from reported — all downstream outputs reflect this adjustment.
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Section: Benchmark ────────────────────────────────────────────────────────

function BenchmarkSection({ deal }: { deal: UnderwritingDeal }) {
  const family  = deal.benchmark_family ?? null;
  const isProxy = deal.benchmark_is_proxy ?? false;
  const label   = family ? (BENCHMARK_LABELS[family] ?? family) : "Unknown";

  const revenue = safe(deal.revenue);
  const usable  = safe(deal.usable_sde ?? deal.sde);
  const sdeMargin = revenue > 0 ? usable / revenue : null;

  return (
    <Card>
      <SectionHeader
        label="Benchmark Reference"
        sub={isProxy ? "Using closest available RMA industry proxy" : "Direct RMA industry benchmark"}
      />

      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", borderRadius: 10, marginBottom: 12,
        background: T.bgInset, border: `1px solid ${T.border}`,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: T.text,
            fontFamily: T.sans, letterSpacing: "-0.01em",
          }}>
            {isProxy ? `${label} (Proxy)` : label}
          </div>
          {family && (
            <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2, fontFamily: T.mono }}>
              {family}
            </div>
          )}
        </div>
        {isProxy ? (
          <div style={{
            padding: "4px 10px", borderRadius: 20,
            fontSize: 10, fontWeight: 700,
            background: T.amberBg, color: T.amber,
            border: `1px solid ${T.amberBd}`,
            flexShrink: 0,
          }}>
            Closest Available Proxy
          </div>
        ) : (
          <div style={{
            padding: "4px 10px", borderRadius: 20,
            fontSize: 10, fontWeight: 700,
            background: T.greenBg, color: T.green,
            border: `1px solid ${T.greenBd}`,
            flexShrink: 0,
          }}>
            Direct Benchmark
          </div>
        )}
      </div>

      {sdeMargin !== null && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <DataRow
            label="Usable SDE Margin"
            value={pct(sdeMargin)}
            sub="Usable SDE ÷ Revenue (basis for benchmark comparison)"
          />
        </div>
      )}

      {isProxy && (
        <div style={{
          marginTop: 10, padding: "8px 12px", borderRadius: 8,
          background: T.slateBg, border: `1px solid ${T.slateBd}`,
          fontSize: 11, color: T.textSub, lineHeight: 1.5,
        }}>
          Margin comparisons use the closest available RMA proxy. Industry-specific economics
          may differ — interpret benchmark guidance with appropriate context.
        </div>
      )}
    </Card>
  );
}

// ── Section: Valuation ────────────────────────────────────────────────────────

function ValuationSection({ deal }: { deal: UnderwritingDeal }) {
  const fairValue   = safe(deal.fair_value);
  const askingPrice = safe(deal.asking_price);
  const multiple    = deal.valuation_multiple ?? null;
  const usableSDE   = safe(deal.usable_sde ?? deal.sde);
  const reportedSDE = safe(deal.reported_sde ?? deal.sde);
  const isAdjusted  = deal.earnings_source && deal.earnings_source !== "reported";

  const gapPct = fairValue > 0 ? ((askingPrice - fairValue) / fairValue) : null;
  const gapColor = gapPct === null ? T.textSub
    : gapPct > 0.10  ? T.red
    : gapPct < -0.05 ? T.green
    : T.amber;

  // What fair value WOULD be using reported SDE (for comparison)
  const reportedFairValue = (usableSDE > 0 && reportedSDE > 0 && fairValue > 0)
    ? Math.round(fairValue * (reportedSDE / usableSDE))
    : null;
  const showComparison = isAdjusted && reportedFairValue !== null && Math.abs(reportedFairValue - fairValue) > 500;

  return (
    <Card>
      <SectionHeader
        label="Valuation"
        sub="Fair value computed using usable SDE — not stated SDE"
      />

      {/* Hero fair value */}
      <div style={{
        padding: "14px 16px", borderRadius: 10, marginBottom: 12,
        background: T.bgInset, border: `1px solid ${T.border}`,
      }}>
        <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>
          Fair Value Estimate
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: T.green, fontFamily: T.mono, letterSpacing: "-0.02em" }}>
          {fmt(fairValue)}
        </div>
        {gapPct !== null && (
          <div style={{ fontSize: 11, color: gapColor, marginTop: 4, fontFamily: T.mono }}>
            {gapPct > 0 ? "+" : ""}{Math.round(gapPct * 100)}% vs asking price
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <DataRow label="Asking Price"     value={fmt(askingPrice)} />
        <DataRow label="Fair Value (adj)" value={fmt(fairValue)}   valueColor={T.green} />
        {multiple !== null && (
          <DataRow
            label="Asking Multiple"
            value={`${multiple.toFixed(2)}x`}
            sub="Price ÷ usable SDE"
          />
        )}
        {gapPct !== null && (
          <DataRow
            label="Pricing Gap"
            value={`${gapPct >= 0 ? "+" : ""}${Math.round(gapPct * 100)}%`}
            valueColor={gapColor}
            sub={gapPct > 0.10 ? "Asking price exceeds fair value" : gapPct < -0.05 ? "Below fair value — potential opportunity" : "Near fair value"}
          />
        )}

        {/* Comparison row — reported scenario */}
        {showComparison && reportedFairValue !== null && (
          <div style={{
            marginTop: 10, padding: "8px 12px", borderRadius: 8,
            background: T.amberBg, border: `1px solid ${T.amberBd}`,
          }}>
            <div style={{ fontSize: 10, color: T.amber, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>
              Reported SDE scenario (not used)
            </div>
            <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.5 }}>
              Using reported SDE of{" "}
              <span style={{ fontFamily: T.mono, color: T.textSub }}>{fmt(reportedSDE)}</span>,
              {" "}fair value would be{" "}
              <span style={{ fontFamily: T.mono, color: T.amber }}>{fmt(reportedFairValue)}</span>
              {" "}— a difference of{" "}
              <span style={{ fontFamily: T.mono, color: T.amber }}>
                {fmt(Math.abs(reportedFairValue - fairValue))}
              </span>.
              {" "}Normalization adjustment applied due to data quality flags.
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Section: Debt Service ─────────────────────────────────────────────────────

function DebtSection({ deal }: { deal: UnderwritingDeal }) {
  const dscr          = safe(deal.dscr);
  const monthly       = deal.monthly_payment ? safe(deal.monthly_payment) : null;
  const usableSDE     = safe(deal.usable_sde ?? deal.sde);
  const reportedSDE   = safe(deal.reported_sde ?? deal.sde);
  const isAdjusted    = deal.earnings_source && deal.earnings_source !== "reported";

  const dscrColor = dscr >= 1.5  ? T.green
    : dscr >= 1.25 ? T.amber
    : dscr >= 1.0  ? T.orange
    :                T.red;

  const dscrLabel = dscr >= 1.5  ? "Strong coverage"
    : dscr >= 1.25 ? "Meets lender minimum"
    : dscr >= 1.0  ? "Below lender minimum"
    :                "Critical — will not qualify";

  // Stress scenarios
  const stress15 = +(dscr * 0.85).toFixed(2);
  const stress25 = +(dscr * 0.75).toFixed(2);

  const stressColor = (s: number) => s >= 1.25 ? T.green : s >= 1.0 ? T.amber : T.red;

  // Reported DSCR (for comparison when adjusted)
  const reportedDscr = (isAdjusted && usableSDE > 0 && reportedSDE > 0)
    ? +(dscr * (reportedSDE / usableSDE)).toFixed(2)
    : null;

  return (
    <Card>
      <SectionHeader
        label="Debt Service Coverage"
        sub="DSCR calculated using usable SDE — trust-adjusted where applicable"
      />

      {/* Hero DSCR */}
      <div style={{
        padding: "14px 16px", borderRadius: 10, marginBottom: 12,
        background: dscrColor + "0a", border: `1px solid ${dscrColor}33`,
      }}>
        <div style={{ fontSize: 10, color: dscrColor, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>
          Debt Service Coverage Ratio
        </div>
        <div style={{
          display: "flex", alignItems: "baseline", gap: 8,
        }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: dscrColor, fontFamily: T.mono, letterSpacing: "-0.02em" }}>
            {dscr.toFixed(2)}x
          </span>
          <span style={{ fontSize: 12, color: dscrColor, fontWeight: 600 }}>{dscrLabel}</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {monthly !== null && (
          <DataRow label="Monthly Debt Service" value={fmt(monthly)} sub="Estimated at assumed terms" />
        )}
        {monthly !== null && (
          <DataRow label="Annual Debt Service"  value={fmt(monthly * 12)} />
        )}
        <DataRow label="Usable SDE Used"   value={fmt(usableSDE)} sub="Trust-gated earnings basis" />

        {/* Stress tests */}
        <div style={{ marginTop: 12, marginBottom: 4 }}>
          <div style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
            Revenue Stress Tests
          </div>
        </div>
        <DataRow
          label="−15% Revenue Stress"
          value={`${stress15}x`}
          valueColor={stressColor(stress15)}
          sub={stress15 >= 1.25 ? "Passes lender threshold" : "Below lender minimum"}
        />
        <DataRow
          label="−25% Revenue Stress"
          value={`${stress25}x`}
          valueColor={stressColor(stress25)}
          sub={stress25 >= 1.25 ? "Passes lender threshold" : "Below lender minimum"}
        />
      </div>

      {/* Reported scenario */}
      {isAdjusted && reportedDscr !== null && (
        <div style={{
          marginTop: 12, padding: "8px 12px", borderRadius: 8,
          background: T.amberBg, border: `1px solid ${T.amberBd}`,
        }}>
          <div style={{ fontSize: 10, color: T.amber, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 4 }}>
            Reported SDE scenario (not used)
          </div>
          <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.5 }}>
            Using reported SDE, DSCR would be{" "}
            <span style={{ fontFamily: T.mono, color: T.amber, fontWeight: 700 }}>{reportedDscr.toFixed(2)}x</span>
            {" "}— normalization adjustment applied due to data quality flags.
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Section: Next Steps ───────────────────────────────────────────────────────

function NextStepsSection({ deal }: { deal: UnderwritingDeal }) {
  const flags     = deal.normalization_flags_json ?? [];
  const dscr      = safe(deal.dscr, 1.5);
  const trust     = safe(deal.normalization_trust_score, 100);
  const steps     = getNextSteps(flags, dscr, trust);

  const sevOrder = { critical: 0, warning: 1, caution: 2, info: 3 };
  const sorted   = [...steps].sort((a, b) => sevOrder[a.severity as keyof typeof sevOrder] - sevOrder[b.severity as keyof typeof sevOrder]);

  if (sorted.length === 0) {
    return (
      <Card>
        <SectionHeader label="Suggested Next Steps" />
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "12px 14px", borderRadius: 8,
          background: T.greenBg, border: `1px solid ${T.greenBd}`,
        }}>
          <span style={{ color: T.green }}>✓</span>
          <span style={{ fontSize: 12, color: T.green }}>
            Financials passed all checks. Proceed with standard due diligence.
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionHeader
        label="Suggested Next Steps"
        sub={`${sorted.length} action${sorted.length !== 1 ? "s" : ""} required before advancing`}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((step, i) => {
          const sc = severityColor(step.severity as NormalizationFlag["severity"]);
          return (
            <div key={i} style={{
              display: "flex", gap: 12, padding: "10px 14px",
              borderRadius: 8,
              background: sc.bg, border: `1px solid ${sc.bd}`,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: sc.color,
                flexShrink: 0, width: 18, textAlign: "center" as const,
                marginTop: 1,
              }}>
                {i + 1}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: sc.color, marginBottom: 3 }}>
                  {step.action}
                </div>
                <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.5 }}>
                  {step.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface UnderwritingPanelProps {
  deal:       UnderwritingDeal;
  onClose?:   () => void;
  isPro?:     boolean;
  mode?:      "panel" | "page";  // "panel" = slide-over, "page" = full page
}

export function UnderwritingPanel({
  deal,
  onClose,
  isPro = true,
  mode  = "panel",
}: UnderwritingPanelProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const trust       = safe(deal.normalization_trust_score, 100);
  const isManual    = deal.manual_review_required ?? false;
  const earningsSrc = deal.earnings_source ?? "reported";

  const navItems = [
    { id: "trust",     label: "Trust",     icon: "⚖" },
    { id: "earnings",  label: "Earnings",  icon: "◈" },
    { id: "benchmark", label: "Benchmark", icon: "⌂" },
    { id: "valuation", label: "Valuation", icon: "◎" },
    { id: "debt",      label: "Debt",      icon: "⬡" },
    { id: "steps",     label: "Actions",   icon: "→" },
  ];

  const trustColor_ = trustColor(trust);

  const containerStyle: React.CSSProperties = mode === "panel"
    ? {
        position: "fixed", top: 0, right: 0,
        width: 480, height: "100vh",
        background: T.bg, borderLeft: `1px solid ${T.border}`,
        zIndex: 300, display: "flex", flexDirection: "column",
        animation: "slideInRight 0.22s cubic-bezier(0.16,1,0.3,1)",
      }
    : {
        background: T.bg, minHeight: "100vh",
        display: "flex", flexDirection: "column",
      };

  return (
    <>
      {mode === "panel" && onClose && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 299,
            backdropFilter: "blur(3px)",
          }}
        />
      )}

      <div style={containerStyle}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{
          padding: "16px 20px 0",
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
          background: "rgba(0,0,0,0.2)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{
                fontSize: 13, fontWeight: 700, color: T.text,
                fontFamily: T.sans, letterSpacing: "-0.01em", marginBottom: 3,
              }}>
                Underwriting Analysis
              </div>
              <div style={{ fontSize: 11, color: T.textMuted }}>
                {deal.industry ?? "Deal"} · {deal.asking_price ? fmt(deal.asking_price) : "—"} asking
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Trust badge */}
              <div style={{
                padding: "3px 10px", borderRadius: 20,
                fontSize: 10, fontWeight: 700,
                background: trustColor_ + "18", color: trustColor_,
                border: `1px solid ${trustColor_}33`,
                fontFamily: T.mono,
              }}>
                Trust {trust}
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  style={{
                    background: "none", border: "none",
                    color: T.textMuted, fontSize: 20, cursor: "pointer",
                    padding: "2px 4px", lineHeight: 1,
                    borderRadius: 6,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Manual review banner */}
          {isManual && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", marginBottom: 10,
              background: T.redBg, border: `1px solid ${T.redBd}`,
              borderRadius: 6, fontSize: 11, color: T.red, fontWeight: 600,
            }}>
              ⚠ Manual review required — conviction cap active
            </div>
          )}

          {/* Earnings adjustment notice */}
          {earningsSrc !== "reported" && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", marginBottom: 10,
              background: T.indigoBg, border: `1px solid ${T.indigoBd}`,
              borderRadius: 6, fontSize: 11, color: T.indigo,
            }}>
              ◈ Earnings basis adjusted — usable SDE differs from reported
            </div>
          )}

          {/* Section nav */}
          <div style={{ display: "flex", gap: 1, marginTop: 4, marginLeft: -4 }}>
            {navItems.map(item => (
              <a
                key={item.id}
                href={`#uw-${item.id}`}
                style={{
                  padding: "6px 10px", borderRadius: 7,
                  fontSize: 11, fontWeight: 500,
                  color: T.textMuted, textDecoration: "none",
                  transition: "color 0.15s, background 0.15s",
                }}
                onMouseEnter={e => {
                  (e.target as HTMLElement).style.color = T.text;
                  (e.target as HTMLElement).style.background = T.bgInset;
                }}
                onMouseLeave={e => {
                  (e.target as HTMLElement).style.color = T.textMuted;
                  (e.target as HTMLElement).style.background = "transparent";
                }}
              >
                {item.icon} {item.label}
              </a>
            ))}
          </div>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div id="uw-trust">     <TrustSection     deal={deal} /></div>
            <div id="uw-earnings">  <EarningsSection  deal={deal} /></div>
            <div id="uw-benchmark"> <BenchmarkSection deal={deal} /></div>
            <div id="uw-valuation"> <ValuationSection deal={deal} /></div>
            <div id="uw-debt">      <DebtSection      deal={deal} /></div>
            <div id="uw-steps">     <NextStepsSection deal={deal} /></div>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: 20, paddingTop: 12,
            borderTop: `1px solid ${T.borderLight}`,
            fontSize: 10, color: T.textDim, lineHeight: 1.6, fontStyle: "italic",
          }}>
            Financial data sourced from broker listing or manual entry. All benchmarks
            derived from RMA industry surveys. Normalization applied per NexTax trust
            scoring engine. This analysis is informational — engage qualified advisors
            for investment decisions.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(40px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

export default UnderwritingPanel;
