// components/TabCompare.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Multi-deal comparison view. Second-level tabs inside My Deals:
//   [Overview] [Financials] [Structure] [Risk]
//
// Architecture:
//   - Compare is a READ-ONLY surface over saved analyses.
//   - Overview uses base deal_runs scoring data — always works.
//   - Financials / Structure / Risk read from benchmark_snapshots (latest per deal).
//   - When a snapshot is missing, the affected sub-tab shows an "Add Financials"
//     CTA that navigates to the Financial Benchmarks tab with the deal preselected.
//
// What stays unchanged:
//   - Top-level tabs (My Deals / Market Comps / Closed Comps) — Market and Closed
//     keep their existing implementation. Second-level tabs are V1-scoped to
//     My Deals only.
//   - Pro gating, comparison-cap throttling, swap handler — all inherited from
//     the previous TabCompare and kept identical.
//
// Important: this file is intentionally self-contained. It does NOT import the
// existing TabCompare logic — instead, the existing comparison rendering is
// embedded as the Overview sub-tab. Market Comps / Closed Comps render their
// previous content unchanged.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import React, { useState, useEffect, useMemo } from "react";

// ── Local types — kept self-contained for portability ───────────────────────

type StatusColor = "red" | "yellow" | "blue" | "green";
type OutlierKind = "strong" | "validation" | "risk" | null;
type BenchmarkSource = "rma" | "dealstats" | null;

type SnapshotMetricRow = {
  metric_key: string;
  metric_label: string;
  benchmark_source: BenchmarkSource;
  deal_value: number | null;
  industry_q1: number | null;
  industry_median: number | null;
  industry_q3: number | null;
  raw_percentile: number | null;
  display_percentile: number | null;
  direction: "higher_is_better" | "lower_is_better";
  status: string | null;
  status_color: StatusColor | null;
  outlier_kind: OutlierKind;
  median_only: boolean;
  insufficient_data: boolean;
  reason?: string;
};

type RiskFlag = {
  severity: "high" | "medium" | "low" | "info";
  metric_key: string;
  message: string;
  rule: string;
};

type InteractionInsight = {
  severity: "high" | "medium" | "info";
  rule: string;
  message: string;
  metrics: string[];
};

type DealStructureMetric = {
  key: "dscr" | "debt_to_sde" | "ltv";
  label: string;
  value: number | null;
  display: string;
  status: string;
  status_color: StatusColor | null;
  explanation: string;
};

type SensitivityAnalysis = {
  source_metric: string;
  reported_value: number;
  industry_median: number;
  normalized_sde: number;
  reported_sde: number;
  normalized_dscr: number | null;
  reported_dscr: number | null;
  insight: string;
};

type Snapshot = {
  snapshot_id: string;
  deal_id: string;
  user_id: string;
  created_at: string;
  industry: string | null;
  is_saved: boolean;
  financial_inputs: any;
  computed_ratios: Record<string, number | null>;
  benchmark_results: SnapshotMetricRow[];
  analysis_outputs: {
    tension_indicator: string | null;
    financial_score: number | null;
    score_drivers: string[];
    score_risk_dependencies: string[];
    risk_flags: RiskFlag[];
    strengths: { metric_key: string; message: string }[];
    interaction_insights: InteractionInsight[];
    sensitivity?: SensitivityAnalysis | null;
    unsupported_metrics: string[];
  };
  deal_structure?: {
    metrics: DealStructureMetric[];
    sources_uses: {
      purchase_price: number;
      buyer_equity: number;
      senior_debt: number;
      seller_note: number;
      working_capital_needed: number;
      total_uses: number;
      total_sources: number;
      balanced: boolean;
    };
    flags: RiskFlag[];
    interpretation: string[];
  };
};

// Minimal DealRun shape used by Overview — mirrors the dashboard's interface.
type DealRun = {
  id: string;
  industry: string;
  asking_price: number;
  fair_value: number;
  valuation_multiple: number;
  dscr: number;
  overall_score: number;
  risk_level: string;
  city: string | null;
  state: string | null;
  revenue?: number;
  sde?: number;
  gap_pct?: number;
};

// ── Component props ──────────────────────────────────────────────────────────

interface TabCompareProps {
  deals: DealRun[];
  isPro: boolean;
  userId: string | null;
  onAnalyzeNew: () => void;
  comparisonsRemaining: number;
  hitCompareCap: boolean;
  onComparisonUsed: () => void;
  /** Navigate user to another top-level dashboard tab (e.g. "benchmarks"). */
  onNavigateToTab?: (tabId: string, dealId?: string) => void;
}

type CompareMode = "my-deals" | "market" | "closed";
type SubTab = "overview" | "financials" | "structure" | "risk";

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = {
  money: (n: number | null | undefined): string => {
    if (n === null || n === undefined || !Number.isFinite(n)) return "—";
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`;
    return `$${Math.round(n).toLocaleString()}`;
  },
  ratio: (n: number | null | undefined): string =>
    n === null || n === undefined || !Number.isFinite(n) ? "—" : `${n.toFixed(2)}x`,
  pct: (n: number | null | undefined): string =>
    n === null || n === undefined || !Number.isFinite(n) ? "—" : `${n.toFixed(1)}%`,
};

function dealLabel(d: DealRun): string {
  const loc = d.city ? `${d.city}, ${d.state ?? ""}` : (d.state ?? "");
  return `${d.industry}${loc ? ` · ${loc}` : ""} · ${fmt.money(d.asking_price)}`;
}

function scoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined || !Number.isFinite(score)) return "#6B7280";
  if (score >= 75) return "#10B981";
  if (score >= 55) return "#3B82F6";
  if (score >= 35) return "#F59E0B";
  return "#EF4444";
}

// ── Main component ──────────────────────────────────────────────────────────

export default function TabCompare({
  deals,
  isPro,
  userId,
  onAnalyzeNew,
  comparisonsRemaining,
  hitCompareCap,
  onComparisonUsed,
  onNavigateToTab,
}: TabCompareProps) {
  const [mode, setMode] = useState<CompareMode>("my-deals");
  const [subTab, setSubTab] = useState<SubTab>("overview");
  const [ai, setAi] = useState(0);
  const [bi, setBi] = useState(Math.min(1, deals.length - 1));

  // Reset to Overview whenever the top-level mode changes
  useEffect(() => {
    setSubTab("overview");
  }, [mode]);

  // ── Snapshot fetching for the two selected deals ─────────────────────────
  const dealA = deals[ai];
  const dealB = deals[bi];

  const [snapshotA, setSnapshotA] = useState<Snapshot | null>(null);
  const [snapshotB, setSnapshotB] = useState<Snapshot | null>(null);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);

  useEffect(() => {
    if (!userId || !dealA?.id || !dealB?.id) {
      setSnapshotA(null);
      setSnapshotB(null);
      return;
    }
    if (mode !== "my-deals") return;   // only fetch when we'll actually use them

    let cancelled = false;
    const dealIds = [dealA.id];
    if (dealB.id !== dealA.id) dealIds.push(dealB.id);

    setSnapshotsLoading(true);
    fetch(`/api/benchmarks/snapshots/latest?user_id=${encodeURIComponent(userId)}&deal_ids=${encodeURIComponent(dealIds.join(","))}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        if (json.ok) {
          setSnapshotA(json.snapshots[dealA.id] ?? null);
          setSnapshotB(json.snapshots[dealB.id] ?? null);
        } else {
          setSnapshotA(null);
          setSnapshotB(null);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSnapshotA(null);
        setSnapshotB(null);
      })
      .finally(() => {
        if (!cancelled) setSnapshotsLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId, dealA?.id, dealB?.id, mode]);

  const dataState: "both" | "one" | "none" = useMemo(() => {
    if (snapshotA && snapshotB) return "both";
    if (snapshotA || snapshotB) return "one";
    return "none";
  }, [snapshotA, snapshotB]);

  // ── Swap handler ────────────────────────────────────────────────────────────
  const handleSwap = () => {
    const tmp = ai;
    setAi(bi);
    setBi(tmp);
  };

  const FREE_MONTHLY_COMPARE_LIMIT = 3;

  const selStyle: React.CSSProperties = {
    padding: "9px 12px", borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
    color: "#E2E8F0", fontSize: 13, outline: "none",
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const handleAddFinancialsClick = (dealId: string) => {
    onNavigateToTab?.("benchmarks", dealId);
  };

  return (
    <div>
      {/* Top-level tab bar */}
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
              color: mode === m ? "#C4B5FD" : "#7C8593",
              fontSize: 12, fontWeight: mode === m ? 600 : 400,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {label}
            {m !== "my-deals" && !isPro && (
              <span style={{ fontSize: 9, color: "#6B7280", marginLeft: 3 }}>🔒</span>
            )}
          </button>
        ))}
      </div>

      {/* My Deals mode — full second-level tab system */}
      {mode === "my-deals" && (
        <div>
          {/* Deal selectors with data-state indicators */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr auto 1fr",
            gap: 10, alignItems: "flex-end", marginBottom: 20,
          }}>
            <DealSelector
              label="Deal A"
              dealIdx={ai}
              deals={deals}
              snapshot={snapshotA}
              loading={snapshotsLoading}
              onChange={(idx) => {
                if (!isPro && hitCompareCap) return;
                setAi(idx);
                onComparisonUsed();
              }}
              selStyle={selStyle}
            />
            <SwapButton onClick={handleSwap} />
            <DealSelector
              label="Deal B"
              dealIdx={bi}
              deals={deals}
              snapshot={snapshotB}
              loading={snapshotsLoading}
              onChange={(idx) => {
                if (!isPro && hitCompareCap) return;
                setBi(idx);
                onComparisonUsed();
              }}
              selStyle={selStyle}
            />
          </div>

          {/* Comparison cap banner (preserved from existing implementation) */}
          {!isPro && (
            <div style={{
              fontSize: 11, color: "#94A3B8", marginBottom: 14,
              padding: "8px 12px", borderRadius: 8,
              background: "rgba(99,102,241,0.04)",
              border: "1px solid rgba(99,102,241,0.12)",
            }}>
              Comparisons this month: {FREE_MONTHLY_COMPARE_LIMIT - comparisonsRemaining} / {FREE_MONTHLY_COMPARE_LIMIT}
              {hitCompareCap && " — upgrade to Pro for unlimited comparisons"}
            </div>
          )}

          {/* Second-level sub-tab nav */}
          <div style={{
            display: "flex", gap: 2, marginBottom: 18,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}>
            {([
              { key: "overview",   label: "Overview",  alwaysOn: true,  needsBoth: false },
              { key: "financials", label: "Financials",alwaysOn: false, needsBoth: true  },
              { key: "structure",  label: "Structure", alwaysOn: false, needsBoth: true  },
              { key: "risk",       label: "Risk",      alwaysOn: false, needsBoth: true  },
            ] as { key: SubTab; label: string; alwaysOn: boolean; needsBoth: boolean }[]).map(t => {
              const locked = !t.alwaysOn && dataState !== "both";
              return (
                <button
                  key={t.key}
                  onClick={() => setSubTab(t.key)}
                  style={{
                    padding: "10px 16px", border: "none",
                    background: "transparent",
                    color: subTab === t.key ? "#A5B4FC" : "#7C8593",
                    fontSize: 12, fontWeight: subTab === t.key ? 600 : 500,
                    borderBottom: subTab === t.key ? "2px solid #6366F1" : "2px solid transparent",
                    marginBottom: -1,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}
                >
                  {t.label}
                  {locked && (
                    <span style={{ fontSize: 9, color: "#6B7280" }}>🔒</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sub-tab content */}
          {dealA && dealB && (
            <>
              {subTab === "overview" && (
                <OverviewSubTab dealA={dealA} dealB={dealB} snapshotA={snapshotA} snapshotB={snapshotB} />
              )}
              {subTab === "financials" && (
                <FinancialsSubTab
                  dealA={dealA} dealB={dealB}
                  snapshotA={snapshotA} snapshotB={snapshotB}
                  dataState={dataState}
                  onAddFinancials={handleAddFinancialsClick}
                />
              )}
              {subTab === "structure" && (
                <StructureSubTab
                  dealA={dealA} dealB={dealB}
                  snapshotA={snapshotA} snapshotB={snapshotB}
                  dataState={dataState}
                  onAddFinancials={handleAddFinancialsClick}
                />
              )}
              {subTab === "risk" && (
                <RiskSubTab
                  dealA={dealA} dealB={dealB}
                  snapshotA={snapshotA} snapshotB={snapshotB}
                  dataState={dataState}
                  onAddFinancials={handleAddFinancialsClick}
                />
              )}
            </>
          )}

          {(!dealA || !dealB) && (
            <div style={{
              padding: "40px 20px", textAlign: "center" as const,
              fontSize: 13, color: "#7C8593",
              background: "rgba(255,255,255,0.02)", borderRadius: 12,
              border: "1px dashed rgba(255,255,255,0.08)",
            }}>
              Select two deals above to compare them.
              {deals.length < 2 && (
                <div style={{ marginTop: 12 }}>
                  <button
                    onClick={onAnalyzeNew}
                    style={{
                      padding: "8px 16px", borderRadius: 8, border: "none",
                      background: "linear-gradient(135deg,#3B82F6,#6366F1)",
                      color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    Analyze a deal →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Market Comps and Closed Comps — placeholder content kept simple.
          Existing Pro gating preserved. We don't add second-level tabs here
          per the V1 scope. */}
      {mode === "market" && (
        <PlaceholderModePanel
          title="Market Comps"
          description="Compare your deals to closed transactions in the same industry. Pro-only."
          isPro={isPro}
        />
      )}
      {mode === "closed" && (
        <PlaceholderModePanel
          title="Closed Comps"
          description="Benchmark against historical SMB acquisition closings. Pro-only."
          isPro={isPro}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Deal selector with data-state indicator
// ─────────────────────────────────────────────────────────────────────────────

function DealSelector({
  label, dealIdx, deals, snapshot, loading, onChange, selStyle,
}: {
  label: string;
  dealIdx: number;
  deals: DealRun[];
  snapshot: Snapshot | null;
  loading: boolean;
  onChange: (idx: number) => void;
  selStyle: React.CSSProperties;
}) {
  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: 5,
      }}>
        <label style={{
          display: "block", fontSize: 10, color: "#7C8593",
          textTransform: "uppercase" as const, letterSpacing: "0.08em",
        }}>
          {label}
        </label>
        <DataStateBadge snapshot={snapshot} loading={loading} />
      </div>
      <select
        value={dealIdx}
        onChange={(e) => onChange(Number(e.target.value))}
        style={selStyle}
      >
        {deals.map((d, i) => (
          <option key={d.id} value={i}>{dealLabel(d)}</option>
        ))}
      </select>
    </div>
  );
}

function DataStateBadge({ snapshot, loading }: { snapshot: Snapshot | null; loading: boolean }) {
  if (loading) {
    return (
      <span style={{
        fontSize: 9, color: "#7C8593", fontStyle: "italic" as const,
      }}>
        checking…
      </span>
    );
  }
  if (snapshot) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: 9, color: "#6EE7B7", fontWeight: 600,
        textTransform: "uppercase" as const, letterSpacing: "0.06em",
        padding: "2px 7px", borderRadius: 5,
        background: "rgba(16,185,129,0.10)",
        border: "1px solid rgba(16,185,129,0.25)",
      }}>
        ✓ Financials Added
      </span>
    );
  }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 9, color: "#FCD34D", fontWeight: 600,
      textTransform: "uppercase" as const, letterSpacing: "0.06em",
      padding: "2px 7px", borderRadius: 5,
      background: "rgba(245,158,11,0.08)",
      border: "1px solid rgba(245,158,11,0.22)",
    }}>
      ⚠ Missing Financials
    </span>
  );
}

function SwapButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Swap deals"
      style={{
        padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.04)", color: "#94A3B8",
        fontSize: 13, cursor: "pointer", marginBottom: 0,
      }}
    >
      ⇄
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable cards / primitives
// ─────────────────────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 12,
      padding: "20px 22px",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, color: "#7C8593", textTransform: "uppercase" as const,
      letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lock state cards — shown when sub-tab data isn't available
// ─────────────────────────────────────────────────────────────────────────────

function LockedSubTabCard({
  bothMissing, dealAMissing, dealBMissing, onAddFinancials, dealAId, dealBId,
}: {
  bothMissing: boolean;
  dealAMissing: boolean;
  dealBMissing: boolean;
  onAddFinancials: (dealId: string) => void;
  dealAId: string;
  dealBId: string;
}) {
  if (bothMissing) {
    return (
      <Card style={{ textAlign: "center" as const, padding: "40px 28px" }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>🔒</div>
        <h3 style={{
          fontSize: 16, fontWeight: 700, margin: "0 0 10px",
          fontFamily: "'Inter Tight',sans-serif", color: "#F1F5F9",
        }}>
          Run Financial Benchmarks first
        </h3>
        <p style={{
          fontSize: 13, color: "#94A3B8", margin: "0 auto 22px",
          maxWidth: 480, lineHeight: 1.6,
        }}>
          Add operating financials (COGS, expenses, working capital) for each deal
          to unlock benchmarking, risk analysis, and normalized DSCR insights.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => onAddFinancials(dealAId)}
            style={primaryButtonStyle()}
          >
            Add Financials for Deal A →
          </button>
          <button
            onClick={() => onAddFinancials(dealBId)}
            style={primaryButtonStyle()}
          >
            Add Financials for Deal B →
          </button>
        </div>
      </Card>
    );
  }

  // Only one deal missing
  const missingLabel = dealAMissing ? "Deal A" : "Deal B";
  const missingId = dealAMissing ? dealAId : dealBId;
  return (
    <Card style={{ padding: "28px" }}>
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 14,
      }}>
        <div style={{ fontSize: 22, lineHeight: 1, marginTop: 1 }}>⚠</div>
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: 15, fontWeight: 700, margin: "0 0 8px",
            fontFamily: "'Inter Tight',sans-serif", color: "#FCD34D",
          }}>
            Incomplete comparison
          </h3>
          <p style={{
            fontSize: 13, color: "#E2E8F0", margin: "0 0 16px", lineHeight: 1.6,
          }}>
            {missingLabel} is missing financial inputs. Add financials to enable
            side-by-side benchmarking.
          </p>
          <button
            onClick={() => onAddFinancials(missingId)}
            style={primaryButtonStyle()}
          >
            Add Financials for {missingLabel} →
          </button>
        </div>
      </div>
    </Card>
  );
}

function primaryButtonStyle(): React.CSSProperties {
  return {
    padding: "9px 18px", borderRadius: 9, border: "none",
    background: "linear-gradient(135deg,#3B82F6,#6366F1)",
    color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-tab: OVERVIEW
// Always works using base deal_runs scoring data + light enhancement from
// snapshot scores when available.
// ─────────────────────────────────────────────────────────────────────────────

function OverviewSubTab({
  dealA, dealB, snapshotA, snapshotB,
}: {
  dealA: DealRun;
  dealB: DealRun;
  snapshotA: Snapshot | null;
  snapshotB: Snapshot | null;
}) {
  // Determine "winner" using overall_score from deal_runs
  const winner = dealA.overall_score >= dealB.overall_score ? "A" : "B";
  const winnerDeal = winner === "A" ? dealA : dealB;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Winner banner */}
      <Card style={{
        background: "rgba(16,185,129,0.04)",
        border: "1px solid rgba(16,185,129,0.22)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 26 }}>🏆</span>
          <div>
            <SectionLabel>Better Opportunity</SectionLabel>
            <div style={{
              fontSize: 16, fontWeight: 700, color: "#F1F5F9",
              fontFamily: "'Inter Tight',sans-serif",
            }}>
              Deal {winner} — {dealLabel(winnerDeal)}
            </div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
              Score: {winnerDeal.overall_score} / 100
              {winner === "A" && dealA.overall_score === dealB.overall_score && " (tied — defaulting to A)"}
            </div>
          </div>
        </div>
      </Card>

      {/* Side-by-side topline comparison */}
      <Card>
        <SectionLabel>Topline Comparison</SectionLabel>
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr)",
          gap: 12,
          fontSize: 13,
        }}>
          <div></div>
          <ColumnHeader winner={winner === "A"}>Deal A</ColumnHeader>
          <ColumnHeader winner={winner === "B"}>Deal B</ColumnHeader>

          <Row label="Industry"      a={dealA.industry}                     b={dealB.industry} />
          <Row label="Asking Price"  a={fmt.money(dealA.asking_price)}      b={fmt.money(dealB.asking_price)} />
          <Row label="Revenue"       a={fmt.money(dealA.revenue ?? null)}   b={fmt.money(dealB.revenue ?? null)} />
          <Row label="SDE"           a={fmt.money(dealA.sde ?? null)}       b={fmt.money(dealB.sde ?? null)} />
          <Row label="Multiple"      a={fmt.ratio(dealA.valuation_multiple)} b={fmt.ratio(dealB.valuation_multiple)} />
          <Row label="DSCR (base)"   a={fmt.ratio(dealA.dscr)}              b={fmt.ratio(dealB.dscr)} />
          <Row label="Fair Value"    a={fmt.money(dealA.fair_value)}        b={fmt.money(dealB.fair_value)} />
          <Row
            label="Gap vs Fair Value"
            a={dealA.gap_pct !== undefined ? `${dealA.gap_pct > 0 ? "+" : ""}${dealA.gap_pct.toFixed(1)}%` : "—"}
            b={dealB.gap_pct !== undefined ? `${dealB.gap_pct > 0 ? "+" : ""}${dealB.gap_pct.toFixed(1)}%` : "—"}
          />
          <Row label="Risk Level"    a={dealA.risk_level}                   b={dealB.risk_level} />
          <Row
            label="Overall Score"
            a={`${dealA.overall_score} / 100`}
            b={`${dealB.overall_score} / 100`}
            highlightWinner={winner}
          />
        </div>
      </Card>

      {/* Financial Benchmarks score (from snapshots, when present) */}
      {(snapshotA || snapshotB) && (
        <Card>
          <SectionLabel>Financial Benchmarks Score</SectionLabel>
          <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr)",
            gap: 12,
            fontSize: 13,
          }}>
            <div></div>
            <ColumnHeader>Deal A</ColumnHeader>
            <ColumnHeader>Deal B</ColumnHeader>

            <Row
              label="Score"
              a={snapshotA ? `${snapshotA.analysis_outputs.financial_score ?? "—"} / 100` : <em style={{ color: "#7C8593" }}>not run</em>}
              b={snapshotB ? `${snapshotB.analysis_outputs.financial_score ?? "—"} / 100` : <em style={{ color: "#7C8593" }}>not run</em>}
            />
            <Row
              label="Tension Indicator"
              a={snapshotA?.analysis_outputs.tension_indicator ?? <span style={{ color: "#6EE7B7" }}>None</span>}
              b={snapshotB?.analysis_outputs.tension_indicator ?? <span style={{ color: "#6EE7B7" }}>None</span>}
            />
            <Row
              label="Risk Flags"
              a={snapshotA ? `${snapshotA.analysis_outputs.risk_flags.length}` : "—"}
              b={snapshotB ? `${snapshotB.analysis_outputs.risk_flags.length}` : "—"}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-tab: FINANCIALS
// ─────────────────────────────────────────────────────────────────────────────

function FinancialsSubTab({
  dealA, dealB, snapshotA, snapshotB, dataState, onAddFinancials,
}: {
  dealA: DealRun;
  dealB: DealRun;
  snapshotA: Snapshot | null;
  snapshotB: Snapshot | null;
  dataState: "both" | "one" | "none";
  onAddFinancials: (dealId: string) => void;
}) {
  if (dataState !== "both") {
    return (
      <LockedSubTabCard
        bothMissing={dataState === "none"}
        dealAMissing={!snapshotA}
        dealBMissing={!snapshotB}
        onAddFinancials={onAddFinancials}
        dealAId={dealA.id}
        dealBId={dealB.id}
      />
    );
  }

  // Both snapshots available — render full comparison
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Operating Ratios side-by-side */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "18px 22px 12px" }}>
          <SectionLabel>Operating Ratios</SectionLabel>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#F1F5F9", fontFamily: "'Inter Tight',sans-serif" }}>
            Side-by-Side Benchmarks
          </h3>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr)",
          gap: 10, alignItems: "center",
          padding: "10px 22px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          background: "rgba(255,255,255,0.01)",
          fontSize: 10, color: "#7C8593", textTransform: "uppercase" as const,
          letterSpacing: "0.08em", fontWeight: 600,
        }}>
          <div>Metric</div>
          <div style={{ textAlign: "right" as const }}>Deal A</div>
          <div style={{ textAlign: "right" as const }}>Deal B</div>
        </div>

        {/* Build a unified metric_key list from both snapshots */}
        {pairedFinancialRows(snapshotA!, snapshotB!).map(({ key, rowA, rowB }, i, arr) => (
          <FinancialsCompareRow
            key={key}
            rowA={rowA}
            rowB={rowB}
            last={i === arr.length - 1}
          />
        ))}
      </Card>
    </div>
  );
}

function pairedFinancialRows(a: Snapshot, b: Snapshot): Array<{ key: string; rowA: SnapshotMetricRow | null; rowB: SnapshotMetricRow | null }> {
  // Use Deal A's row order as canonical; supplement with any rows only in B.
  // For SDE Margin we may have two rows per deal (vs Industry / vs Market) —
  // pair by metric_label so the source distinction is preserved.
  const pairs: Array<{ key: string; rowA: SnapshotMetricRow | null; rowB: SnapshotMetricRow | null }> = [];
  const usedB = new Set<number>();

  a.benchmark_results.forEach(rowA => {
    const matchIdx = b.benchmark_results.findIndex((rB, idx) =>
      !usedB.has(idx) && rB.metric_label === rowA.metric_label
    );
    if (matchIdx >= 0) {
      usedB.add(matchIdx);
      pairs.push({ key: rowA.metric_label, rowA, rowB: b.benchmark_results[matchIdx] });
    } else {
      pairs.push({ key: rowA.metric_label, rowA, rowB: null });
    }
  });

  b.benchmark_results.forEach((rB, idx) => {
    if (usedB.has(idx)) return;
    pairs.push({ key: rB.metric_label, rowA: null, rowB: rB });
  });

  return pairs;
}

function FinancialsCompareRow({
  rowA, rowB, last,
}: {
  rowA: SnapshotMetricRow | null;
  rowB: SnapshotMetricRow | null;
  last: boolean;
}) {
  const label = rowA?.metric_label ?? rowB?.metric_label ?? "—";

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr)",
      gap: 10, alignItems: "center",
      padding: "14px 22px",
      borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.04)",
    }}>
      <div style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 500 }}>
        {label}
      </div>
      <CompareCell row={rowA} />
      <CompareCell row={rowB} />
    </div>
  );
}

function CompareCell({ row }: { row: SnapshotMetricRow | null }) {
  if (!row) {
    return (
      <div style={{ textAlign: "right" as const, fontSize: 11, color: "#6B7280", fontStyle: "italic" as const }}>
        not in this snapshot
      </div>
    );
  }
  if (row.insufficient_data) {
    return (
      <div style={{ textAlign: "right" as const, fontSize: 11, color: "#7C8593", fontStyle: "italic" as const }}>
        Not meaningful
      </div>
    );
  }

  return (
    <div style={{ textAlign: "right" as const, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <div style={{
        fontSize: 14, fontWeight: 700, color: "#F1F5F9",
        fontFamily: "'JetBrains Mono',monospace",
      }}>
        {formatMetricValue(row.metric_key, row.deal_value)}
      </div>
      {row.outlier_kind && (
        <OutlierBadge kind={row.outlier_kind} />
      )}
      {!row.outlier_kind && row.status && row.status_color && (
        <Badge color={row.status_color} label={row.status} compact />
      )}
      {row.display_percentile !== null && (
        <div style={{ fontSize: 10, color: "#7C8593", fontFamily: "'JetBrains Mono',monospace" }}>
          {row.display_percentile}th pctile
        </div>
      )}
    </div>
  );
}

function OutlierBadge({ kind }: { kind: NonNullable<OutlierKind> }) {
  const config = {
    strong:     { bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)",  text: "#6EE7B7", label: "Strong Outlier" },
    validation: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "#FCD34D", label: "Validation Outlier" },
    risk:       { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)",  text: "#FCA5A5", label: "Risk Outlier" },
  } as const;
  const c = config[kind];
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, color: c.text,
      padding: "2px 7px", borderRadius: 5,
      background: c.bg, border: `1px solid ${c.border}`,
    }}>
      {c.label}
    </span>
  );
}

function Badge({ color, label, compact }: { color: StatusColor; label: string; compact?: boolean }) {
  const colorMap = {
    red:    { bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.25)",  text: "#FCA5A5" },
    yellow: { bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.25)", text: "#FCD34D" },
    blue:   { bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.25)", text: "#93C5FD" },
    green:  { bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.25)", text: "#6EE7B7" },
  } as const;
  const c = colorMap[color];
  return (
    <span style={{
      fontSize: compact ? 10 : 11, fontWeight: 600, color: c.text,
      padding: compact ? "2px 7px" : "3px 9px", borderRadius: 5,
      background: c.bg, border: `1px solid ${c.border}`,
    }}>
      {label}
    </span>
  );
}

function formatMetricValue(metric_key: string, value: number | null): string {
  if (value === null) return "—";
  if (metric_key.endsWith("_pct")) return `${value.toFixed(1)}%`;
  if (metric_key === "days_inventory_outstanding") return `${Math.round(value)}d`;
  return `${value.toFixed(2)}x`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-tab: STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

function StructureSubTab({
  dealA, dealB, snapshotA, snapshotB, dataState, onAddFinancials,
}: {
  dealA: DealRun;
  dealB: DealRun;
  snapshotA: Snapshot | null;
  snapshotB: Snapshot | null;
  dataState: "both" | "one" | "none";
  onAddFinancials: (dealId: string) => void;
}) {
  if (dataState !== "both") {
    return (
      <LockedSubTabCard
        bothMissing={dataState === "none"}
        dealAMissing={!snapshotA}
        dealBMissing={!snapshotB}
        onAddFinancials={onAddFinancials}
        dealAId={dealA.id}
        dealBId={dealB.id}
      />
    );
  }

  // Even with snapshots, deal_structure may be null (user didn't fill structure inputs)
  const dsA = snapshotA?.deal_structure;
  const dsB = snapshotB?.deal_structure;

  if (!dsA || !dsB) {
    return (
      <Card style={{ padding: 28 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ fontSize: 22, lineHeight: 1, marginTop: 1 }}>⚠</div>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: 15, fontWeight: 700, margin: "0 0 8px",
              fontFamily: "'Inter Tight',sans-serif", color: "#FCD34D",
            }}>
              Deal structure data missing
            </h3>
            <p style={{ fontSize: 13, color: "#E2E8F0", margin: "0 0 16px", lineHeight: 1.6 }}>
              {!dsA && !dsB && "Neither deal has acquisition structure inputs (purchase price, buyer equity, senior debt). "}
              {!dsA && dsB && "Deal A is missing acquisition structure inputs. "}
              {dsA && !dsB && "Deal B is missing acquisition structure inputs. "}
              Add them in the Financial Benchmarks tab to enable structural leverage comparison.
            </p>
            {!dsA && (
              <button onClick={() => onAddFinancials(dealA.id)} style={{ ...primaryButtonStyle(), marginRight: 8 }}>
                Add Structure for Deal A →
              </button>
            )}
            {!dsB && (
              <button onClick={() => onAddFinancials(dealB.id)} style={primaryButtonStyle()}>
                Add Structure for Deal B →
              </button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Pair metrics by key
  const findMetric = (ds: typeof dsA, key: "dscr" | "debt_to_sde" | "ltv") =>
    ds.metrics.find(m => m.key === key);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <SectionLabel>Deal Structure & Leverage</SectionLabel>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px", color: "#F1F5F9", fontFamily: "'Inter Tight',sans-serif" }}>
          Acquisition Metrics
        </h3>

        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr)",
          gap: 10, alignItems: "center", fontSize: 13,
        }}>
          <div></div>
          <ColumnHeader>Deal A</ColumnHeader>
          <ColumnHeader>Deal B</ColumnHeader>

          {(["dscr", "debt_to_sde", "ltv"] as const).map(key => {
            const mA = findMetric(dsA, key);
            const mB = findMetric(dsB, key);
            const label = mA?.label ?? mB?.label ?? key;
            return (
              <React.Fragment key={key}>
                <div style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 500, padding: "10px 0" }}>
                  {label}
                </div>
                <StructureCell metric={mA} />
                <StructureCell metric={mB} />
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      {/* Sources & Uses comparison */}
      <Card>
        <SectionLabel>Sources &amp; Uses</SectionLabel>
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr)",
          gap: 10, fontSize: 13, alignItems: "center",
        }}>
          <div></div>
          <ColumnHeader>Deal A</ColumnHeader>
          <ColumnHeader>Deal B</ColumnHeader>

          <Row label="Purchase Price"           a={fmt.money(dsA.sources_uses.purchase_price)}         b={fmt.money(dsB.sources_uses.purchase_price)} />
          <Row label="Buyer Equity"             a={fmt.money(dsA.sources_uses.buyer_equity)}           b={fmt.money(dsB.sources_uses.buyer_equity)} />
          <Row label="Senior Debt"              a={fmt.money(dsA.sources_uses.senior_debt)}            b={fmt.money(dsB.sources_uses.senior_debt)} />
          <Row label="Seller Note"              a={fmt.money(dsA.sources_uses.seller_note)}            b={fmt.money(dsB.sources_uses.seller_note)} />
          <Row label="Working Capital Needed"   a={fmt.money(dsA.sources_uses.working_capital_needed)} b={fmt.money(dsB.sources_uses.working_capital_needed)} />
          <Row
            label="Sources balanced?"
            a={dsA.sources_uses.balanced ? <span style={{ color: "#6EE7B7" }}>✓ Yes</span> : <span style={{ color: "#FCD34D" }}>⚠ No</span>}
            b={dsB.sources_uses.balanced ? <span style={{ color: "#6EE7B7" }}>✓ Yes</span> : <span style={{ color: "#FCD34D" }}>⚠ No</span>}
          />
        </div>
      </Card>
    </div>
  );
}

function StructureCell({ metric }: { metric: DealStructureMetric | undefined }) {
  if (!metric || metric.value === null) {
    return <div style={{ textAlign: "right" as const, fontSize: 11, color: "#6B7280" }}>—</div>;
  }
  return (
    <div style={{ textAlign: "right" as const, padding: "10px 0", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#F1F5F9", fontFamily: "'JetBrains Mono',monospace" }}>
        {metric.display}
      </div>
      {metric.status_color && (
        <Badge color={metric.status_color} label={metric.status} compact />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-tab: RISK
// ─────────────────────────────────────────────────────────────────────────────

function RiskSubTab({
  dealA, dealB, snapshotA, snapshotB, dataState, onAddFinancials,
}: {
  dealA: DealRun;
  dealB: DealRun;
  snapshotA: Snapshot | null;
  snapshotB: Snapshot | null;
  dataState: "both" | "one" | "none";
  onAddFinancials: (dealId: string) => void;
}) {
  if (dataState !== "both") {
    return (
      <LockedSubTabCard
        bothMissing={dataState === "none"}
        dealAMissing={!snapshotA}
        dealBMissing={!snapshotB}
        onAddFinancials={onAddFinancials}
        dealAId={dealA.id}
        dealBId={dealB.id}
      />
    );
  }

  const aoA = snapshotA!.analysis_outputs;
  const aoB = snapshotB!.analysis_outputs;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Tension indicators side-by-side */}
      {(aoA.tension_indicator || aoB.tension_indicator) && (
        <Card>
          <SectionLabel>Mixed Signals</SectionLabel>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
          }}>
            <TensionCard tension={aoA.tension_indicator} dealLabel="Deal A" />
            <TensionCard tension={aoB.tension_indicator} dealLabel="Deal B" />
          </div>
        </Card>
      )}

      {/* Risk flags side-by-side */}
      <Card>
        <SectionLabel>Risk Flags</SectionLabel>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14,
        }}>
          <RiskFlagsColumn dealLabel="Deal A" flags={aoA.risk_flags} insights={aoA.interaction_insights} />
          <RiskFlagsColumn dealLabel="Deal B" flags={aoB.risk_flags} insights={aoB.interaction_insights} />
        </div>
      </Card>

      {/* Sensitivity comparison */}
      {(aoA.sensitivity || aoB.sensitivity) && (
        <Card>
          <SectionLabel>SDE Normalization Sensitivity</SectionLabel>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14,
          }}>
            <SensitivityColumn dealLabel="Deal A" sensitivity={aoA.sensitivity ?? null} />
            <SensitivityColumn dealLabel="Deal B" sensitivity={aoB.sensitivity ?? null} />
          </div>
        </Card>
      )}
    </div>
  );
}

function TensionCard({ tension, dealLabel }: { tension: string | null; dealLabel: string }) {
  if (!tension) {
    return (
      <div style={{
        padding: "14px 16px", borderRadius: 10,
        background: "rgba(16,185,129,0.04)",
        border: "1px solid rgba(16,185,129,0.18)",
      }}>
        <div style={{
          fontSize: 10, color: "#6EE7B7", fontWeight: 600,
          textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 6,
        }}>
          {dealLabel} · No Tension
        </div>
        <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>
          Cash flow, structure, and benchmarks aligned.
        </div>
      </div>
    );
  }
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 10,
      background: "rgba(245,158,11,0.06)",
      border: "1px solid rgba(245,158,11,0.25)",
    }}>
      <div style={{
        fontSize: 10, color: "#FCD34D", fontWeight: 700,
        textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 6,
      }}>
        {dealLabel} · ⚖ Mixed Signals
      </div>
      <div style={{ fontSize: 12, color: "#E2E8F0", lineHeight: 1.55 }}>
        {tension}
      </div>
    </div>
  );
}

function RiskFlagsColumn({
  dealLabel, flags, insights,
}: {
  dealLabel: string;
  flags: RiskFlag[];
  insights: InteractionInsight[];
}) {
  const hasNothing = flags.length === 0 && insights.length === 0;

  return (
    <div style={{
      padding: "14px 16px", borderRadius: 10,
      background: hasNothing ? "rgba(16,185,129,0.04)" : "rgba(239,68,68,0.04)",
      border: `1px solid ${hasNothing ? "rgba(16,185,129,0.18)" : "rgba(239,68,68,0.18)"}`,
    }}>
      <div style={{
        fontSize: 10, color: hasNothing ? "#6EE7B7" : "#FCA5A5",
        fontWeight: 700, textTransform: "uppercase" as const,
        letterSpacing: "0.08em", marginBottom: 10,
      }}>
        {dealLabel} {hasNothing ? "· No Flags" : `· ${flags.length + insights.length} Issue${flags.length + insights.length === 1 ? "" : "s"}`}
      </div>
      {hasNothing ? (
        <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>
          No deterministic risk flags or cross-metric insights triggered.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {insights.length > 0 && (
            <>
              <div style={{
                fontSize: 9, color: "#FCA5A5", fontWeight: 600,
                textTransform: "uppercase" as const, letterSpacing: "0.1em",
              }}>
                ⚡ Cross-Metric
              </div>
              {insights.map((ins, i) => (
                <div key={i} style={{ fontSize: 12, color: "#E2E8F0", lineHeight: 1.55, paddingLeft: 12, position: "relative" as const }}>
                  <span style={{ position: "absolute" as const, left: 0, top: 6, width: 5, height: 5, borderRadius: "50%", background: "#EF4444" }} />
                  {ins.message}
                </div>
              ))}
            </>
          )}
          {flags.length > 0 && (
            <>
              {insights.length > 0 && (
                <div style={{
                  fontSize: 9, color: "#FCD34D", fontWeight: 600,
                  textTransform: "uppercase" as const, letterSpacing: "0.1em", marginTop: 4,
                }}>
                  Single-Metric
                </div>
              )}
              {flags.map((f, i) => (
                <div key={i} style={{ fontSize: 12, color: "#E2E8F0", lineHeight: 1.55, paddingLeft: 12, position: "relative" as const }}>
                  <span style={{
                    position: "absolute" as const, left: 0, top: 6,
                    width: 5, height: 5, borderRadius: "50%",
                    background: f.severity === "high" ? "#EF4444" : f.severity === "medium" ? "#F59E0B" : "#94A3B8",
                  }} />
                  {f.message}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SensitivityColumn({
  dealLabel, sensitivity,
}: {
  dealLabel: string;
  sensitivity: SensitivityAnalysis | null;
}) {
  if (!sensitivity) {
    return (
      <div style={{
        padding: "14px 16px", borderRadius: 10,
        background: "rgba(16,185,129,0.04)",
        border: "1px solid rgba(16,185,129,0.18)",
      }}>
        <div style={{
          fontSize: 10, color: "#6EE7B7", fontWeight: 700,
          textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 6,
        }}>
          {dealLabel} · SDE Looks Reasonable
        </div>
        <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>
          Reported SDE is in line with industry — no normalization stress test needed.
        </div>
      </div>
    );
  }

  const breaches = sensitivity.normalized_dscr !== null && sensitivity.normalized_dscr < 1.30;

  return (
    <div style={{
      padding: "14px 16px", borderRadius: 10,
      background: breaches ? "rgba(239,68,68,0.04)" : "rgba(245,158,11,0.04)",
      border: `1px solid ${breaches ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.22)"}`,
    }}>
      <div style={{
        fontSize: 10, color: breaches ? "#FCA5A5" : "#FCD34D",
        fontWeight: 700, textTransform: "uppercase" as const,
        letterSpacing: "0.08em", marginBottom: 8,
      }}>
        {dealLabel} · 🔬 Sensitivity
      </div>
      <div style={{ fontSize: 12, color: "#E2E8F0", lineHeight: 1.55, marginBottom: 10 }}>
        {sensitivity.insight}
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
        fontSize: 11, fontFamily: "'JetBrains Mono',monospace",
      }}>
        <div>
          <div style={{ color: "#7C8593", fontSize: 9, marginBottom: 2 }}>Reported DSCR</div>
          <div style={{ color: "#E2E8F0", fontWeight: 600 }}>{fmt.ratio(sensitivity.reported_dscr)}</div>
        </div>
        <div>
          <div style={{ color: "#7C8593", fontSize: 9, marginBottom: 2 }}>Normalized DSCR</div>
          <div style={{ color: breaches ? "#FCA5A5" : "#E2E8F0", fontWeight: 700 }}>{fmt.ratio(sensitivity.normalized_dscr)}</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable row / column primitives
// ─────────────────────────────────────────────────────────────────────────────

function ColumnHeader({ children, winner }: { children: React.ReactNode; winner?: boolean }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: winner ? "#6EE7B7" : "#94A3B8",
      textAlign: "right" as const, paddingBottom: 8,
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      display: "inline-flex", alignItems: "center", justifyContent: "flex-end",
      gap: 6, width: "100%",
    }}>
      {winner && <span style={{ fontSize: 11 }}>🏆</span>}
      {children}
    </div>
  );
}

function Row({
  label, a, b, highlightWinner,
}: {
  label: string;
  a: React.ReactNode;
  b: React.ReactNode;
  highlightWinner?: "A" | "B";
}) {
  return (
    <>
      <div style={{ fontSize: 12, color: "#94A3B8", padding: "8px 0" }}>{label}</div>
      <div style={{
        fontSize: 13, color: highlightWinner === "A" ? "#6EE7B7" : "#E2E8F0",
        fontWeight: highlightWinner === "A" ? 700 : 500,
        textAlign: "right" as const, padding: "8px 0",
        fontFamily: typeof a === "string" && /^[\d$.\-+, x%]+$/.test(a) ? "'JetBrains Mono',monospace" : undefined,
      }}>
        {a}
      </div>
      <div style={{
        fontSize: 13, color: highlightWinner === "B" ? "#6EE7B7" : "#E2E8F0",
        fontWeight: highlightWinner === "B" ? 700 : 500,
        textAlign: "right" as const, padding: "8px 0",
        fontFamily: typeof b === "string" && /^[\d$.\-+, x%]+$/.test(b) ? "'JetBrains Mono',monospace" : undefined,
      }}>
        {b}
      </div>
    </>
  );
}

function PlaceholderModePanel({ title, description, isPro }: { title: string; description: string; isPro: boolean }) {
  return (
    <Card style={{ padding: "40px 28px", textAlign: "center" as const }}>
      <h3 style={{
        fontSize: 16, fontWeight: 700, margin: "0 0 8px",
        fontFamily: "'Inter Tight',sans-serif", color: "#F1F5F9",
      }}>
        {title}
      </h3>
      <p style={{ fontSize: 13, color: "#94A3B8", margin: "0 auto 16px", maxWidth: 460, lineHeight: 1.6 }}>
        {description}
      </p>
      {!isPro && (
        <div style={{
          fontSize: 11, color: "#A5B4FC", fontWeight: 600,
          padding: "6px 12px", borderRadius: 6,
          background: "rgba(99,102,241,0.10)", display: "inline-block",
        }}>
          🔒 Pro feature
        </div>
      )}
    </Card>
  );
}
