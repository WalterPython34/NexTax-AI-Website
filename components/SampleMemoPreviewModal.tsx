// components/SampleMemoPreviewModal.tsx
//
// Decision-grade IC memo preview. Shown to free users from the Home tab as a
// Pro-quality demo. The tone should feel like materials prepared by a deal
// team for lender / investor review — analytical, precise, unflinching.
//
// Sample deal: Specialty Trade Services, TX — $2.45M asking, Adjusted SDE $640K,
// Verdict INVESTIGATE. Swap with real generated sample when available.

"use client";

import React, { useEffect, useCallback } from "react";

interface SampleMemoPreviewModalProps {
  onClose:       () => void;
  onAnalyzeDeal: () => void;   // "Analyze your deal" → AnalyzeDealModal
  onUpgrade:     () => void;   // "Unlock full memo export" → /pricing
}

// Inline formatter — kept self-contained so this component has no external deps
const fmt = (n: number): string => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
};

// ── Shared section-header style ───────────────────────────────────────────────
const sectionLabel = {
  fontSize:       10,
  color:          "#7C8593",
  textTransform:  "uppercase" as const,
  letterSpacing:  "0.09em",
  fontWeight:     600,
  marginBottom:   10,
};

export function SampleMemoPreviewModal({ onClose, onAnalyzeDeal, onUpgrade }: SampleMemoPreviewModalProps) {
  // Lock body scroll while modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  // Esc to close
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // ─── Sample deal data — Specialty Trade Services, TX ───────────────────────
  const deal = {
    title:          "Specialty Trade Services",
    location:       "Dallas-Fort Worth, TX",
    industry:       "Specialty trade contractors (NAICS 238)",
    daysOnMarket:   47,
    asking:         2_450_000,
    reportedSDE:    780_000,
    adjustedSDE:    640_000,
    totalAdjustments: -140_000,  // reported→adjusted delta
    adjustmentPct:  -17.9,
    dscr:           1.28,
    multiple:       3.83,   // asking / adjusted SDE
    trustScore:     72,
    riskLevel:      "Moderate",
    verdict:        "INVESTIGATE",

    // Benchmarks — what this deal looks like vs the peer universe
    benchmarks: {
      thisDeal:      { multiple: 3.83,  sdeMargin: 18.4, growth:  2.1 },
      industryMedian:{ multiple: 3.20,  sdeMargin: 16.5, growth:  4.8 },
      topQuartile:   { multiple: 3.80,  sdeMargin: 22.0, growth:  9.5 },
    },

    // Normalization drivers — what moved reported→adjusted
    adjustmentDrivers: [
      { label: "Owner compensation normalization",   amount: -90_000,  note: "Market replacement salary estimate" },
      { label: "Non-recurring add-backs removed",    amount: -60_000,  note: "Legal settlement, one-time repair" },
      { label: "Legitimate add-backs retained",      amount: +10_000,  note: "Personal vehicle, family phone plan" },
    ],

    // Each flag includes WHY it matters to a buyer
    redFlags: [
      {
        flag:   "Revenue concentration",
        detail: "Top customer represents 32% of TTM revenue. Loss of this account would immediately breach SBA DSCR covenants and impair debt service capacity.",
      },
      {
        flag:   "Add-back substantiation gap",
        detail: "$210K of the $260K add-back schedule lacks independent documentation. If any portion is disallowed, adjusted SDE drops below $580K and multiple expands to 4.2x+.",
      },
      {
        flag:   "Owner-operator dependency",
        detail: "Owner handles estimating, client relationships, and subcontractor coordination. No documented SOPs or second-in-command — transition risk is material.",
      },
    ],

    // Lender perspective block
    lender: {
      likelihood:  "Conditional",
      strengths: [
        "DSCR of 1.28x clears the 1.25x SBA 7(a) minimum",
        "Industry (specialty trade) is SBA-preferred with established lender appetite",
        "Real-estate-adjacent cash flow supports collateral structure",
      ],
      concerns: [
        "Customer concentration above 25% typically triggers additional documentation and may require personal guarantee enhancement",
        "Add-back quality will be scrutinized — underwriter may independently re-adjust SDE downward",
        "Thin coverage cushion leaves no room for performance miss in year one",
      ],
      summary: "Financeable under SBA 7(a), but not without conditions. Expect the underwriter to re-examine adjusted earnings independently and require mitigation on customer concentration before committee approval.",
    },

    offer: {
      anchor:    1_820_000,
      rangeLow:  1_750_000,
      rangeHigh: 2_050_000,
      walkAway:  2_050_000,
    },

    // Local market dynamics block
    localMarket: {
      competitorDensity: "High — 47 comparable operators within 25 miles of DFW metro",
      marketStructure:   "Fragmented (no operator exceeds 4% share)",
      localRange:        "$1.6M–$2.2M for comparable SDE band ($500K–$750K)",
      interpretation:    "Fragmented structure suggests no strategic acquirer premium — pricing should align with cash-flow multiples, not scarcity value. Asking price sits at the upper edge of the observed local band.",
    },

    diligencePriorities: [
      "Obtain 3-year bank statements and tax returns; independently reconstruct SDE and validate every add-back line item",
      "Secure customer concentration report: top 10 accounts by revenue, tenure, contract status (at-will vs. committed), and margin contribution",
      "Interview top 2–3 customers under NDA to assess relationship stickiness and post-transition retention likelihood",
      "Review all subcontractor agreements and key vendor relationships for transferability and change-of-control clauses",
      "Commission Quality of Earnings lite (trailing 24 months) to validate adjusted SDE before LOI",
      "Obtain owner-transition plan with specific commitment periods and success milestones",
    ],
  };

  // ── Compact benchmark row renderer ─────────────────────────────────────────
  const BenchmarkRow = ({ label, thisDeal, median, topQ, suffix, flip }: {
    label: string; thisDeal: number; median: number; topQ: number; suffix: string; flip?: boolean;
  }) => {
    // flip=true means lower is better (e.g. multiple — lower price is better)
    // flip=false means higher is better (e.g. margin, growth)
    const vsMedian = flip ? (thisDeal < median) : (thisDeal > median);
    const thisColor = vsMedian ? "#10B981" : (flip ? (thisDeal > median * 1.1) : (thisDeal < median * 0.9)) ? "#F87171" : "#F59E0B";
    return (
      <div style={{
        display:             "grid",
        gridTemplateColumns: "minmax(0, 1.3fr) repeat(3, minmax(0, 1fr))",
        gap:                 10,
        alignItems:          "center",
        padding:             "10px 0",
        borderBottom:        "1px solid rgba(255,255,255,0.04)",
        fontSize:            12,
      }}>
        <div style={{ color: "#C4C8D1", fontWeight: 500 }}>{label}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: thisColor, textAlign: "right" as const }}>
          {thisDeal.toFixed(thisDeal < 10 ? 2 : 1)}{suffix}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", color: "#94A3B8", textAlign: "right" as const }}>
          {median.toFixed(median < 10 ? 2 : 1)}{suffix}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", color: "#94A3B8", textAlign: "right" as const }}>
          {topQ.toFixed(topQ < 10 ? 2 : 1)}{suffix}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position:             "fixed",
          inset:                 0,
          background:            "rgba(5,7,10,0.78)",
          zIndex:                500,
          backdropFilter:        "blur(6px)",
          WebkitBackdropFilter:  "blur(6px)",
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sample-memo-title"
        style={{
          position:       "fixed",
          top:            "50%",
          left:           "50%",
          transform:      "translate(-50%, -50%)",
          zIndex:          501,
          width:           "calc(100% - 32px)",
          maxWidth:        960,
          maxHeight:       "88vh",
          display:         "flex",
          flexDirection:   "column" as const,
          borderRadius:    14,
          background:      "#0A0E14",
          border:          "1px solid rgba(255,255,255,0.1)",
          boxShadow:       "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)",
          fontFamily:      "'Inter Tight', -apple-system, sans-serif",
          color:           "#E2E8F0",
          overflow:        "hidden",
        }}
      >
        {/* ═══ HEADER ═══════════════════════════════════════════════════════ */}
        <div
          style={{
            padding:        "20px 24px 18px",
            borderBottom:   "1px solid rgba(255,255,255,0.06)",
            display:        "flex",
            alignItems:     "flex-start",
            justifyContent: "space-between",
            gap:             16,
            flexShrink:      0,
          }}
        >
          <div>
            <div style={{ fontSize: 10, color: "#A5B4FC", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 500, marginBottom: 6 }}>
              Sample IC memo · Pro preview
            </div>
            <h2
              id="sample-memo-title"
              style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#F1F5F9", letterSpacing: "-0.015em" }}
            >
              See what your deal becomes
            </h2>
            <p style={{ fontSize: 12, color: "#94A3B8", margin: "4px 0 0", lineHeight: 1.5 }}>
              Turn any listing into a lender-ready investment memo in seconds.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background:   "transparent",
              border:       "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              width:        30,
              height:       30,
              color:        "#94A3B8",
              fontSize:     16,
              cursor:       "pointer",
              fontFamily:   "inherit",
              lineHeight:   1,
              padding:      0,
              flexShrink:   0,
            }}
          >
            ×
          </button>
        </div>

        {/* ═══ BODY (scrollable) ════════════════════════════════════════════ */}
        <div
          style={{
            flex:       1,
            overflowY:  "auto",
            padding:    "22px 24px",
          }}
        >
          {/* ── 1. INVESTMENT SNAPSHOT ─────────────────────────────────── */}
          <div style={{ marginBottom: 22 }}>
            <div style={sectionLabel}>1 · Investment snapshot</div>
            <div
              style={{
                padding:       "16px 18px",
                borderRadius:  10,
                background:    "rgba(255,255,255,0.02)",
                border:        "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" as const, marginBottom: 14 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#F1F5F9", lineHeight: 1.3, marginBottom: 3 }}>
                    {deal.title}
                  </div>
                  <div style={{ fontSize: 11, color: "#7C8593" }}>
                    {deal.location} · {deal.industry} · Listed {deal.daysOnMarket} days
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" as const }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 6,
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                    background: "rgba(245,158,11,0.12)", color: "#F59E0B",
                    border: "1px solid rgba(245,158,11,0.35)",
                  }}>
                    ⚠ IC VERDICT: {deal.verdict}
                  </span>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 6,
                    fontSize: 10, fontWeight: 600,
                    background: "rgba(245,158,11,0.06)", color: "#F59E0B",
                    border: "1px solid rgba(245,158,11,0.25)",
                  }}>
                    Adjusted · Trust {deal.trustScore}
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 10 }}>
                {[
                  { label: "Asking price",  value: fmt(deal.asking),      color: "#E2E8F0" },
                  { label: "Reported SDE",  value: fmt(deal.reportedSDE), color: "#94A3B8" },
                  { label: "Adjusted SDE",  value: fmt(deal.adjustedSDE), color: "#F59E0B", note: `${deal.adjustmentPct.toFixed(1)}% vs reported` },
                ].map((m) => (
                  <div key={m.label}>
                    <div style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 3 }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.01em" }}>
                      {m.value}
                    </div>
                    {m.note && (
                      <div style={{ fontSize: 10, color: "#F59E0B", marginTop: 2 }}>
                        {m.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{
                padding: "9px 11px", borderRadius: 7, marginTop: 12,
                background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.18)",
                fontSize: 11.5, color: "#C4C8D1", lineHeight: 1.55,
              }}>
                Normalization adjustments of {fmt(Math.abs(deal.totalAdjustments))} reduce reported SDE to a defensible underwriting basis. Trust score of {deal.trustScore} indicates that adjusted figures require independent validation before committee.
              </div>
            </div>
          </div>

          {/* ── 2. KEY METRICS ─────────────────────────────────────────── */}
          <div style={{ marginBottom: 22 }}>
            <div style={sectionLabel}>2 · Key metrics</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
              {[
                { label: "DSCR",        value: `${deal.dscr.toFixed(2)}x`,     color: "#F59E0B", sub: "Marginal coverage" },
                { label: "Multiple",    value: `${deal.multiple.toFixed(2)}x`, color: "#F59E0B", sub: "On adjusted SDE" },
                { label: "Risk",        value: deal.riskLevel,                 color: "#F59E0B", sub: "3 material flags" },
                { label: "Trust score", value: `${deal.trustScore}/100`,       color: "#F59E0B", sub: "Adjustments material" },
              ].map((m) => (
                <div
                  key={m.label}
                  style={{
                    padding: "11px 13px", borderRadius: 9,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 4 }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono', monospace" }}>
                    {m.value}
                  </div>
                  <div style={{ fontSize: 10, color: "#7C8593", marginTop: 3 }}>
                    {m.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 3. MARKET BENCHMARKING ─────────────────────────────────── */}
          <div style={{ marginBottom: 22 }}>
            <div style={sectionLabel}>3 · Market benchmarking</div>
            <div
              style={{
                padding: "14px 18px 16px", borderRadius: 10,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {/* Header row */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.3fr) repeat(3, minmax(0, 1fr))",
                gap: 10,
                paddingBottom: 7,
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                fontSize: 9,
                color: "#7C8593",
                textTransform: "uppercase" as const,
                letterSpacing: "0.07em",
                fontWeight: 600,
              }}>
                <div></div>
                <div style={{ textAlign: "right" as const, color: "#A5B4FC" }}>This deal</div>
                <div style={{ textAlign: "right" as const }}>Industry median</div>
                <div style={{ textAlign: "right" as const }}>Top quartile</div>
              </div>

              <BenchmarkRow
                label="Valuation multiple (MVIC/SDE)"
                thisDeal={deal.benchmarks.thisDeal.multiple}
                median={deal.benchmarks.industryMedian.multiple}
                topQ={deal.benchmarks.topQuartile.multiple}
                suffix="x"
                flip
              />
              <BenchmarkRow
                label="SDE margin"
                thisDeal={deal.benchmarks.thisDeal.sdeMargin}
                median={deal.benchmarks.industryMedian.sdeMargin}
                topQ={deal.benchmarks.topQuartile.sdeMargin}
                suffix="%"
              />
              <BenchmarkRow
                label="Revenue growth (3-yr)"
                thisDeal={deal.benchmarks.thisDeal.growth}
                median={deal.benchmarks.industryMedian.growth}
                topQ={deal.benchmarks.topQuartile.growth}
                suffix="%"
              />

              <div style={{
                marginTop: 12, padding: "9px 11px", borderRadius: 7,
                background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.18)",
                fontSize: 11.5, color: "#C4C8D1", lineHeight: 1.55,
              }}>
                Deal is priced at top-quartile valuation while delivering median margin and below-median growth — the pricing suggests a premium asset but the fundamentals do not yet support that positioning. Requires validation that underlying performance justifies the asking multiple.
              </div>
            </div>
          </div>

          {/* ── 4. EARNINGS NORMALIZATION SUMMARY ──────────────────────── */}
          <div style={{ marginBottom: 22 }}>
            <div style={sectionLabel}>4 · Earnings normalization</div>
            <div
              style={{
                padding: "14px 18px 16px", borderRadius: 10,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {/* Summary strip */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 14,
                marginBottom: 14,
                paddingBottom: 12,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div>
                  <div style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 3 }}>
                    Reported SDE
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmt(deal.reportedSDE)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 3 }}>
                    Total adjustments
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#F87171", fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmt(deal.totalAdjustments)}
                  </div>
                  <div style={{ fontSize: 10, color: "#F87171", marginTop: 1 }}>
                    {deal.adjustmentPct.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 3 }}>
                    Adjusted SDE
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#F1F5F9", fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmt(deal.adjustedSDE)}
                  </div>
                  <div style={{ fontSize: 10, color: "#A5B4FC", marginTop: 1 }}>
                    Underwriting basis
                  </div>
                </div>
              </div>

              {/* Driver list */}
              <div style={{ fontSize: 10, color: "#7C8593", textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 600, marginBottom: 8 }}>
                Adjustment drivers
              </div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 7 }}>
                {deal.adjustmentDrivers.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 12,
                      alignItems: "center",
                      padding: "7px 10px",
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.015)",
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, color: "#C4C8D1", fontWeight: 500 }}>{d.label}</div>
                      <div style={{ fontSize: 10, color: "#7C8593", marginTop: 1 }}>{d.note}</div>
                    </div>
                    <div style={{
                      fontSize: 12.5, fontWeight: 700,
                      color: d.amount < 0 ? "#F87171" : "#10B981",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {d.amount > 0 ? "+" : ""}{fmt(d.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 5. RED FLAGS ───────────────────────────────────────────── */}
          <div style={{ marginBottom: 22 }}>
            <div style={sectionLabel}>5 · Red flags</div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
              {deal.redFlags.map((f, i) => (
                <div
                  key={i}
                  style={{
                    padding: "11px 13px", borderRadius: 8,
                    background: "rgba(239,68,68,0.04)",
                    border: "1px solid rgba(239,68,68,0.18)",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 4 }}>
                    <span style={{ color: "#F87171", fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>⚠</span>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "#F87171" }}>{f.flag}</div>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#C4C8D1", lineHeight: 1.6, paddingLeft: 23 }}>
                    {f.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 6. LENDER PERSPECTIVE ──────────────────────────────────── */}
          <div style={{ marginBottom: 22 }}>
            <div style={sectionLabel}>6 · Lender perspective</div>
            <div
              style={{
                padding: "14px 18px 16px", borderRadius: 10,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {/* Likelihood chip */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" as const }}>
                <div style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 600 }}>
                  Financing likelihood
                </div>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: 6,
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.03em",
                  background: "rgba(245,158,11,0.12)", color: "#F59E0B",
                  border: "1px solid rgba(245,158,11,0.35)",
                }}>
                  {deal.lender.likelihood.toUpperCase()}
                </span>
              </div>

              {/* Strengths + concerns */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#10B981", textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 700, marginBottom: 7 }}>
                    Strengths
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 5 }}>
                    {deal.lender.strengths.map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 11.5, color: "#C4C8D1", lineHeight: 1.55 }}>
                        <span style={{ color: "#10B981", flexShrink: 0, fontWeight: 700, marginTop: 1 }}>✓</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#F59E0B", textTransform: "uppercase" as const, letterSpacing: "0.07em", fontWeight: 700, marginBottom: 7 }}>
                    Concerns
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 5 }}>
                    {deal.lender.concerns.map((c, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 11.5, color: "#C4C8D1", lineHeight: 1.55 }}>
                        <span style={{ color: "#F59E0B", flexShrink: 0, fontWeight: 700, marginTop: 1 }}>!</span>
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{
                padding: "10px 12px", borderRadius: 7,
                background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.18)",
                fontSize: 12, color: "#C4C8D1", lineHeight: 1.6, fontStyle: "italic" as const,
              }}>
                {deal.lender.summary}
              </div>
            </div>
          </div>

          {/* ── 7. RECOMMENDED OFFER STRATEGY ──────────────────────────── */}
          <div style={{ marginBottom: 22 }}>
            <div style={sectionLabel}>7 · Recommended offer strategy</div>
            <div
              style={{
                padding: "16px 18px", borderRadius: 10,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 4 }}>
                    Opening anchor
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#10B981", fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmt(deal.offer.anchor)}
                  </div>
                  <div style={{ fontSize: 10, color: "#7C8593", marginTop: 2 }}>
                    2.85x adjusted SDE
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 4 }}>
                    Reasonable range
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmt(deal.offer.rangeLow)} – {fmt(deal.offer.rangeHigh)}
                  </div>
                  <div style={{ fontSize: 10, color: "#7C8593", marginTop: 2 }}>
                    2.7x – 3.2x adjusted
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 4 }}>
                    Max justified
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#F59E0B", fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmt(deal.offer.walkAway)}
                  </div>
                  <div style={{ fontSize: 10, color: "#7C8593", marginTop: 2 }}>
                    Fair-value ceiling
                  </div>
                </div>
              </div>
              <div style={{
                padding: "9px 11px", borderRadius: 7,
                background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
                fontSize: 11.5, color: "#C4C8D1", lineHeight: 1.55,
              }}>
                Asking price of {fmt(deal.asking)} sits {Math.round(((deal.asking - deal.offer.walkAway) / deal.offer.walkAway) * 100)}% above the fair-value ceiling. Opening at {fmt(deal.offer.anchor)} establishes credibility at a defensible anchor while leaving room to close within the reasonable range.
              </div>
            </div>
          </div>

          {/* ── 8. LOCAL MARKET DYNAMICS ───────────────────────────────── */}
          <div style={{ marginBottom: 22 }}>
            <div style={sectionLabel}>8 · Local market dynamics</div>
            <div
              style={{
                padding: "14px 18px 16px", borderRadius: 10,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 0.55fr) minmax(0, 1fr)",
                gap: "10px 16px",
                fontSize: 11.5,
                marginBottom: 12,
              }}>
                <div style={{ color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.07em", fontSize: 9, fontWeight: 600, alignSelf: "center" }}>
                  Competitor density
                </div>
                <div style={{ color: "#C4C8D1", lineHeight: 1.5 }}>{deal.localMarket.competitorDensity}</div>

                <div style={{ color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.07em", fontSize: 9, fontWeight: 600, alignSelf: "center" }}>
                  Market structure
                </div>
                <div style={{ color: "#C4C8D1", lineHeight: 1.5 }}>{deal.localMarket.marketStructure}</div>

                <div style={{ color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.07em", fontSize: 9, fontWeight: 600, alignSelf: "center" }}>
                  Local valuation range
                </div>
                <div style={{ color: "#C4C8D1", lineHeight: 1.5, fontFamily: "'JetBrains Mono', monospace" }}>
                  {deal.localMarket.localRange}
                </div>
              </div>

              <div style={{
                padding: "9px 11px", borderRadius: 7,
                background: "rgba(96,165,250,0.04)", border: "1px solid rgba(96,165,250,0.18)",
                fontSize: 11.5, color: "#C4C8D1", lineHeight: 1.55,
              }}>
                {deal.localMarket.interpretation}
              </div>
            </div>
          </div>

          {/* ── 9. DILIGENCE PRIORITIES ────────────────────────────────── */}
          <div style={{ marginBottom: 6 }}>
            <div style={sectionLabel}>9 · Diligence priorities</div>
            <div
              style={{
                padding: "14px 16px", borderRadius: 9,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {deal.diligencePriorities.map((p, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: i < deal.diligencePriorities.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    fontSize: 12,
                    color: "#C4C8D1",
                    lineHeight: 1.55,
                  }}
                >
                  <span style={{
                    width: 18, height: 18, borderRadius: 4,
                    border: "1px solid rgba(165,180,252,0.4)",
                    background: "rgba(99,102,241,0.08)",
                    fontSize: 10, color: "#A5B4FC",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, fontWeight: 700, marginTop: 1,
                  }}>
                    {i + 1}
                  </span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ FOOTER ═══════════════════════════════════════════════════════ */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.015)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap" as const,
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "#6B7280",
              fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: "8px 4px",
            }}
          >
            Maybe later
          </button>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
            <button
              onClick={onUpgrade}
              style={{
                padding: "10px 18px", borderRadius: 8,
                border: "1px solid rgba(165,180,252,0.35)",
                background: "rgba(99,102,241,0.08)",
                color: "#A5B4FC", fontSize: 12.5, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Unlock full memo export
            </button>
            <button
              onClick={onAnalyzeDeal}
              style={{
                padding: "10px 20px", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                color: "#fff", fontSize: 12.5, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Analyze your deal →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default SampleMemoPreviewModal;
