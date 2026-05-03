// components/FinancialBenchmarksTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Financial Benchmarks tab — the credit-memo-style underwriting view that
// sits between My Deals and Market Intel.
//
// Pipeline (matches the spec's strict order):
//   1. User picks a saved deal (auto-populates revenue, SDE, asking, industry)
//   2. User adds post-NDA fields (COGS, working capital, debt structure)
//   3. Click "Run Analysis" → POST /api/benchmarks/score-deal
//   4. Render deterministic results (table + risk flags + deal structure card)
//   5. (Optional) Click "Generate Interpretation" → POST /api/benchmarks/interpret
//
// Visual: matches the existing dark dashboard but with extra whitespace,
// larger metric numbers, and a credit-memo feel — institutional, not startup.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import React, { useState, useMemo } from "react";

// ── Local minimal types (avoid coupling tightly to dashboard types) ─────────
// We intentionally keep this self-contained so the component can be lifted
// out of the dashboard later without dragging type imports along.

type SavedDeal = {
  id: string;
  industry: string;
  asking_price: number;
  revenue?: number;
  sde?: number;
  city?: string | null;
  state?: string | null;
};

type OutlierKind = "strong" | "validation" | "risk" | null;
type StatusColor = "red" | "yellow" | "blue" | "green";

type MetricRow = {
  metric_key: string;
  metric_label: string;
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
  insufficient_data: boolean;
  reason?: string;
};

type RiskFlag = {
  severity: "high" | "medium" | "low" | "info";
  metric_key: string;
  message: string;
  rule: string;
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

type DealStructureAnalysis = {
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

type BenchmarkAnalysis = {
  industry: string;
  naics_code: string | null;
  industry_name: string | null;
  benchmark_year: string;
  generated_at: string;
  financial_position: MetricRow[];
  risk_flags: RiskFlag[];
  strengths: { metric_key: string; message: string }[];
  deal_structure?: DealStructureAnalysis;
  financial_score: number | null;
  score_drivers: string[];
  unsupported_metrics: string[];
};

// ── Component props ──────────────────────────────────────────────────────────

interface FinancialBenchmarksTabProps {
  /** Existing deals from the parent dashboard — same array used by My Deals */
  deals: SavedDeal[];
  /** Existing Pro detection from the parent dashboard */
  isPro: boolean;
  /** Optional: when free user hits a Pro feature, escalate to existing modal */
  onShowUpgrade?: () => void;
}

// ── Visual primitives (match existing dashboard language) ────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14,
      padding: "22px 24px",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, color: "#7C8593", textTransform: "uppercase",
      letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8,
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

// ── Color tokens (match spec's percentile bar palette) ──────────────────────

const SEGMENT_COLORS = {
  red:    "#EF4444",
  yellow: "#F59E0B",
  blue:   "#3B82F6",
  green:  "#10B981",
  empty:  "rgba(255,255,255,0.06)",
} as const;

function colorForSegmentIndex(i: number): keyof typeof SEGMENT_COLORS {
  if (i < 2) return "red";       // 0-20
  if (i < 5) return "yellow";    // 20-50
  if (i < 7) return "blue";      // 50-70
  return "green";                // 70-100
}

// ── Percentile bar — 10 segments, color reflects segment band ────────────────

function PercentileBar({ percentile }: { percentile: number | null }) {
  const segments = Array.from({ length: 10 }, (_, i) => {
    const segmentMid = (i + 1) * 10 - 5;
    const filled = percentile !== null && percentile >= segmentMid;
    return {
      filled,
      color: SEGMENT_COLORS[colorForSegmentIndex(i)],
    };
  });

  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {segments.map((s, i) => (
        <div
          key={i}
          style={{
            width: 8, height: 14, borderRadius: 2,
            background: s.filled ? s.color : SEGMENT_COLORS.empty,
            transition: "background 0.2s",
          }}
        />
      ))}
    </div>
  );
}

// ── Status badge with three-way outlier disambiguation ──────────────────────

function StatusBadge({ row }: { row: MetricRow }) {
  if (row.insufficient_data) {
    return (
      <span style={{
        fontSize: 11, color: "#7C8593", fontStyle: "italic",
      }}>
        Not meaningful
      </span>
    );
  }

  // Three-way outlier labels per Steve's spec
  if (row.outlier_kind === "strong") {
    return <Badge color="green" label="Strong Outlier" />;
  }
  if (row.outlier_kind === "validation") {
    return <Badge color="yellow" label="Validation Outlier" tooltip="Unusually high — verify the underlying numbers" />;
  }
  if (row.outlier_kind === "risk") {
    return <Badge color="red" label="Risk Outlier" />;
  }

  // Non-outlier statuses — In Line / Strong / Below Median / Bottom Quartile
  if (!row.status || !row.status_color) return null;
  return <Badge color={row.status_color} label={row.status} />;
}

function Badge({ color, label, tooltip }: { color: StatusColor; label: string; tooltip?: string }) {
  const colorMap = {
    red:    { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)",  text: "#FCA5A5" },
    yellow: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "#FCD34D" },
    blue:   { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", text: "#93C5FD" },
    green:  { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", text: "#6EE7B7" },
  } as const;
  const c = colorMap[color];
  return (
    <span
      title={tooltip}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "3px 9px", borderRadius: 8,
        background: c.bg, border: `1px solid ${c.border}`,
        fontSize: 11, fontWeight: 600, color: c.text,
        cursor: tooltip ? "help" : "default",
      }}
    >
      {label}
    </span>
  );
}

// ── Number formatting helpers ────────────────────────────────────────────────

const fmt = {
  ratio: (n: number | null, suffix = "x") =>
    n === null ? "—" : `${n.toFixed(2)}${suffix}`,
  pct: (n: number | null) =>
    n === null ? "—" : `${n.toFixed(1)}%`,
  money: (n: number | null) =>
    n === null ? "—" : `$${Math.round(n).toLocaleString()}`,
  bigMoney: (n: number | null) => {
    if (n === null) return "—";
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`;
    return `$${Math.round(n)}`;
  },
};

/** Format a metric value based on its key (ratio vs percentage). */
function formatMetricValue(metric_key: string, value: number | null): string {
  if (value === null) return "—";
  if (metric_key.endsWith("_pct")) return `${value.toFixed(1)}%`;
  if (metric_key === "days_inventory_outstanding") return `${Math.round(value)}d`;
  return `${value.toFixed(2)}x`;
}

// ── Main component ──────────────────────────────────────────────────────────

export default function FinancialBenchmarksTab({
  deals,
  isPro,
  onShowUpgrade,
}: FinancialBenchmarksTabProps) {
  const [selectedDealId, setSelectedDealId] = useState<string>("");
  const selectedDeal = useMemo(
    () => deals.find(d => d.id === selectedDealId) ?? null,
    [deals, selectedDealId],
  );

  // ── Inputs state ───────────────────────────────────────────────────────────
  // Auto-populated when a saved deal is picked. User edits/adds the rest.

  const [cogs, setCogs] = useState<string>("");
  const [opex, setOpex] = useState<string>("");
  const [cash, setCash] = useState<string>("");
  const [ar, setAr] = useState<string>("");
  const [inventory, setInventory] = useState<string>("");
  const [ap, setAp] = useState<string>("");
  const [totalDebt, setTotalDebt] = useState<string>("");
  const [rate, setRate] = useState<string>("10.5");
  const [term, setTerm] = useState<string>("10");

  // Deal Structure inputs
  const [purchasePrice, setPurchasePrice] = useState<string>("");
  const [buyerEquity, setBuyerEquity] = useState<string>("");
  const [seniorDebt, setSeniorDebt] = useState<string>("");
  const [sellerNote, setSellerNote] = useState<string>("");
  const [wcNeeded, setWcNeeded] = useState<string>("");

  // Auto-populate from selected deal whenever selection changes
  React.useEffect(() => {
    if (!selectedDeal) return;
    // Asking price → purchase price
    setPurchasePrice(selectedDeal.asking_price ? String(selectedDeal.asking_price) : "");
    // 80% senior debt as starting point (typical SBA structure)
    if (selectedDeal.asking_price) {
      setSeniorDebt(String(Math.round(selectedDeal.asking_price * 0.8)));
      setBuyerEquity(String(Math.round(selectedDeal.asking_price * 0.2)));
      setTotalDebt(String(Math.round(selectedDeal.asking_price * 0.8)));
    }
  }, [selectedDealId]);

  // ── Analysis state ─────────────────────────────────────────────────────────

  const [analysis, setAnalysis] = useState<BenchmarkAnalysis | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [interpretation, setInterpretation] = useState<string[] | null>(null);
  const [interpretationLoading, setInterpretationLoading] = useState(false);
  const [interpretationError, setInterpretationError] = useState<string | null>(null);

  // ── Run deterministic analysis ─────────────────────────────────────────────

  async function runAnalysis() {
    if (!selectedDeal) {
      setError("Pick a saved deal first.");
      return;
    }
    setError(null);
    setAnalysis(null);
    setInterpretation(null);
    setRunning(true);

    const num = (s: string): number | null => {
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : null;
    };

    const inputs = {
      industry: selectedDeal.industry,
      revenue: selectedDeal.revenue ?? 0,
      sde: selectedDeal.sde ?? 0,
      cogs: num(cogs),
      operating_expenses: num(opex),
      cash: num(cash),
      accounts_receivable: num(ar),
      inventory: num(inventory),
      accounts_payable: num(ap),
      total_debt: num(totalDebt),
      interest_rate_pct: num(rate),
      loan_term_years: num(term),
    };

    const purchasePriceNum = num(purchasePrice);
    const deal_structure =
      purchasePriceNum !== null
        ? {
            purchase_price: purchasePriceNum,
            buyer_equity: num(buyerEquity) ?? 0,
            senior_debt: num(seniorDebt) ?? 0,
            seller_note: num(sellerNote) ?? 0,
            working_capital_needed: num(wcNeeded) ?? 0,
            sde: selectedDeal.sde ?? 0,
            annual_debt_service: 0, // server fills from operating debt terms
          }
        : undefined;

    try {
      const res = await fetch("/api/benchmarks/score-deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs, deal_structure }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Analysis failed");
      } else {
        setAnalysis(json.analysis);
      }
    } catch (err: any) {
      setError(err?.message ?? "Network error");
    } finally {
      setRunning(false);
    }
  }

  // ── Generate AI interpretation ─────────────────────────────────────────────

  async function generateInterpretation() {
    if (!isPro) {
      onShowUpgrade?.();
      return;
    }
    if (!analysis) return;
    setInterpretationError(null);
    setInterpretationLoading(true);
    try {
      const res = await fetch("/api/benchmarks/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis }),
      });
      const json = await res.json();
      if (!json.ok) {
        setInterpretationError(json.error ?? "Interpretation failed");
      } else {
        setInterpretation(json.interpretation ?? []);
      }
    } catch (err: any) {
      setInterpretationError(err?.message ?? "Network error");
    } finally {
      setInterpretationLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Intro / context ── */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
          <div style={{ flex: 1 }}>
            <SectionLabel>Credit Memo Snapshot</SectionLabel>
            <h2 style={{
              fontSize: 20, fontWeight: 700, margin: "0 0 8px",
              fontFamily: "'Inter Tight',sans-serif", letterSpacing: "-0.02em", color: "#F1F5F9",
            }}>
              Financial Position vs Industry
            </h2>
            <p style={{ fontSize: 13, color: "#94A3B8", margin: 0, maxWidth: 640, lineHeight: 1.55 }}>
              Compares the deal's operating ratios against RMA Annual Statement Studies industry distributions.
              Deterministic risk flags load instantly. AI interpretation is generated on demand.
            </p>
          </div>
          {!isPro && (
            <div style={{
              padding: "8px 12px", borderRadius: 10,
              background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)",
              fontSize: 11, color: "#94A3B8", maxWidth: 220, lineHeight: 1.5,
            }}>
              <ProBadge /> &nbsp; unlocks full risk flags, AI interpretation, and PDF export.
            </div>
          )}
        </div>
      </Card>

      {/* ── Inputs section ── */}
      <Card>
        <SectionLabel>Deal Inputs</SectionLabel>
        <h3 style={{
          fontSize: 16, fontWeight: 700, margin: "0 0 4px",
          fontFamily: "'Inter Tight',sans-serif", color: "#F1F5F9",
        }}>
          Pick a saved deal, then add post-NDA detail
        </h3>
        <p style={{ fontSize: 12, color: "#7C8593", margin: "0 0 18px" }}>
          Revenue, SDE, asking price, and industry auto-populate. Add the financials you receive after signing the NDA.
        </p>

        {/* Saved deal selector */}
        <div style={{ marginBottom: 18 }}>
          <Label>Saved Deal</Label>
          <select
            value={selectedDealId}
            onChange={(e) => setSelectedDealId(e.target.value)}
            style={selectStyle}
          >
            <option value="">— Select a deal —</option>
            {deals.map(d => (
              <option key={d.id} value={d.id}>
                {d.industry} · {d.city ?? "?"}, {d.state ?? "?"} · ask {fmt.bigMoney(d.asking_price)}
              </option>
            ))}
          </select>
          {deals.length === 0 && (
            <p style={{ fontSize: 11, color: "#7C8593", marginTop: 6 }}>
              No saved deals yet. Analyze a deal first from the Home or Dashboard tab.
            </p>
          )}
        </div>

        {/* Auto-populated context (shown when deal selected) */}
        {selectedDeal && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12, marginBottom: 22,
            padding: "12px 14px", borderRadius: 10,
            background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.12)",
          }}>
            <ContextField label="Industry" value={selectedDeal.industry} />
            <ContextField label="Location" value={`${selectedDeal.city ?? "—"}, ${selectedDeal.state ?? "—"}`} />
            <ContextField label="Revenue" value={fmt.bigMoney(selectedDeal.revenue ?? null)} />
            <ContextField label="SDE" value={fmt.bigMoney(selectedDeal.sde ?? null)} />
            <ContextField label="Asking" value={fmt.bigMoney(selectedDeal.asking_price)} />
          </div>
        )}

        {/* Two-column input grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }} className="benchmarks-input-grid">

          {/* Left: Operating financials */}
          <div>
            <SectionLabel>Operating Financials</SectionLabel>
            <FieldGrid>
              <NumField label="COGS"          value={cogs}      onChange={setCogs}      placeholder="e.g. 1,170,000" />
              <NumField label="Operating Expenses" value={opex} onChange={setOpex}      placeholder="e.g. 1,300,000" />
              <NumField label="Cash"          value={cash}      onChange={setCash}      placeholder="e.g. 80,000" />
              <NumField label="Accounts Receivable" value={ar}  onChange={setAr}        placeholder="e.g. 220,000" />
              <NumField label="Inventory"     value={inventory} onChange={setInventory} placeholder="0 if service biz" />
              <NumField label="Accounts Payable" value={ap}     onChange={setAp}        placeholder="e.g. 110,000" />
            </FieldGrid>
          </div>

          {/* Right: Deal structure */}
          <div>
            <SectionLabel>Deal Structure (Acquisition)</SectionLabel>
            <FieldGrid>
              <NumField label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice} />
              <NumField label="Buyer Equity"   value={buyerEquity}   onChange={setBuyerEquity} />
              <NumField label="Senior Debt"    value={seniorDebt}    onChange={setSeniorDebt} />
              <NumField label="Seller Note"    value={sellerNote}    onChange={setSellerNote} />
              <NumField label="Working Capital Needed" value={wcNeeded} onChange={setWcNeeded} />
            </FieldGrid>

            <SectionLabel>{/* spacer */}&nbsp;</SectionLabel>
            <SectionLabel>Debt Terms</SectionLabel>
            <FieldGrid>
              <NumField label="Total Debt"   value={totalDebt} onChange={setTotalDebt} />
              <NumField label="Rate (%)"     value={rate}      onChange={setRate} />
              <NumField label="Term (years)" value={term}      onChange={setTerm} />
            </FieldGrid>
          </div>
        </div>

        <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 12, alignItems: "center" }}>
          {error && <span style={{ fontSize: 12, color: "#FCA5A5" }}>{error}</span>}
          <button
            onClick={runAnalysis}
            disabled={running || !selectedDeal}
            className="btn-action"
            style={{
              padding: "10px 22px", borderRadius: 9, border: "none",
              background: running || !selectedDeal
                ? "rgba(99,102,241,0.3)"
                : "linear-gradient(135deg,#3B82F6,#6366F1)",
              color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: running || !selectedDeal ? "not-allowed" : "pointer",
              opacity: running || !selectedDeal ? 0.6 : 1,
            }}
          >
            {running ? "Running analysis…" : "Run Analysis →"}
          </button>
        </div>
      </Card>

      {/* ── Results: deterministic ── */}
      {analysis && (
        <>
          {/* Score banner */}
          <Card>
            <div style={{ display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flexShrink: 0 }}>
                <SectionLabel>Financial Score</SectionLabel>
                <div style={{
                  fontSize: 56, fontWeight: 700, lineHeight: 1,
                  fontFamily: "'JetBrains Mono',monospace",
                  color: scoreColor(analysis.financial_score),
                  letterSpacing: "-0.04em",
                }}>
                  {analysis.financial_score ?? "—"}
                </div>
                <div style={{ fontSize: 11, color: "#7C8593", marginTop: 4 }}>out of 100</div>
              </div>

              <div style={{ flex: 1, minWidth: 280 }}>
                <SectionLabel>Industry Context</SectionLabel>
                <div style={{ fontSize: 14, color: "#E2E8F0", marginBottom: 10, fontWeight: 500 }}>
                  {analysis.industry_name ?? analysis.industry}
                  {analysis.naics_code && (
                    <span style={{ color: "#7C8593", marginLeft: 8, fontFamily: "'JetBrains Mono',monospace" }}>
                      NAICS {analysis.naics_code}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#7C8593", lineHeight: 1.6 }}>
                  Source: RMA Annual Statement Studies · {analysis.benchmark_year}
                </div>
              </div>

              {analysis.score_drivers.length > 0 && (
                <div style={{ flex: 1, minWidth: 220 }}>
                  <SectionLabel>Top Drivers</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {analysis.score_drivers.map((d, i) => (
                      <div key={i} style={{ fontSize: 12, color: "#94A3B8" }}>• {d}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Financial Position table */}
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px 14px" }}>
              <SectionLabel>Financial Position vs Industry</SectionLabel>
              <h3 style={{
                fontSize: 16, fontWeight: 700, margin: 0,
                fontFamily: "'Inter Tight',sans-serif", color: "#F1F5F9",
              }}>
                Operating Ratios
              </h3>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 0.9fr) minmax(0, 0.9fr) minmax(0, 0.7fr) auto minmax(0, 1.1fr)",
              gap: 14, alignItems: "center",
              padding: "10px 24px",
              borderTop: "1px solid rgba(255,255,255,0.04)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              background: "rgba(255,255,255,0.01)",
            }}>
              <ColHeader>Metric</ColHeader>
              <ColHeader align="right">Your Deal</ColHeader>
              <ColHeader align="right">Industry Median</ColHeader>
              <ColHeader align="right">Percentile</ColHeader>
              <ColHeader>Visual</ColHeader>
              <ColHeader>Status</ColHeader>
            </div>

            {analysis.financial_position.map((row, i, arr) => (
              <MetricTableRow key={row.metric_key} row={row} last={i === arr.length - 1} />
            ))}
          </Card>

          {/* Risk Signals + What This Means (two-column) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="benchmarks-panels-grid">

            {/* Risk Signals */}
            <Card style={{
              background: "rgba(239,68,68,0.04)",
              border: "1px solid rgba(239,68,68,0.18)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 16 }}>⚠</span>
                <h3 style={{
                  fontSize: 15, fontWeight: 700, margin: 0,
                  fontFamily: "'Inter Tight',sans-serif", color: "#FCA5A5",
                }}>
                  Risk Signals
                </h3>
              </div>

              {!isPro ? (
                <ProGatedHint label="Risk flag detection requires Pro" onUpgrade={onShowUpgrade} />
              ) : analysis.risk_flags.length === 0 ? (
                <p style={{ fontSize: 12, color: "#7C8593", margin: 0 }}>
                  No deterministic risk flags triggered.
                </p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                  {analysis.risk_flags.map((f, i) => (
                    <li key={i} style={{
                      fontSize: 12, color: "#E2E8F0", lineHeight: 1.55,
                      paddingLeft: 14, position: "relative",
                    }}>
                      <span style={{
                        position: "absolute", left: 0, top: 6,
                        width: 6, height: 6, borderRadius: "50%",
                        background: f.severity === "high" ? "#EF4444"
                                  : f.severity === "medium" ? "#F59E0B"
                                  : "#94A3B8",
                      }} />
                      {f.message}
                    </li>
                  ))}
                </ul>
              )}

              {analysis.strengths.length > 0 && isPro && (
                <>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "16px 0" }} />
                  <div style={{ fontSize: 10, color: "#6EE7B7", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 }}>
                    Strengths
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                    {analysis.strengths.map((s, i) => (
                      <li key={i} style={{ fontSize: 12, color: "#94A3B8", paddingLeft: 14, position: "relative", lineHeight: 1.55 }}>
                        <span style={{ position: "absolute", left: 0, top: 5, color: "#10B981" }}>✓</span>
                        {s.message}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>

            {/* What This Means (AI interpretation) */}
            <Card>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>💡</span>
                  <h3 style={{
                    fontSize: 15, fontWeight: 700, margin: 0,
                    fontFamily: "'Inter Tight',sans-serif", color: "#F1F5F9",
                  }}>
                    What This Means
                  </h3>
                </div>
                {!interpretation && (
                  <button
                    onClick={generateInterpretation}
                    disabled={interpretationLoading}
                    className="btn-action"
                    style={{
                      padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(99,102,241,0.3)",
                      background: "rgba(99,102,241,0.08)", color: "#A5B4FC",
                      fontSize: 11, fontWeight: 600, cursor: "pointer",
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {interpretationLoading ? "Generating benchmark interpretation…" : "Generate Interpretation"}
                    {!isPro && <span>🔒</span>}
                  </button>
                )}
              </div>

              {interpretation ? (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                  {interpretation.map((line, i) => (
                    <li key={i} style={{
                      fontSize: 12, color: "#E2E8F0", lineHeight: 1.6,
                      paddingLeft: 14, position: "relative",
                    }}>
                      <span style={{
                        position: "absolute", left: 0, top: 6,
                        width: 6, height: 6, borderRadius: "50%", background: "#A5B4FC",
                      }} />
                      {line}
                    </li>
                  ))}
                </ul>
              ) : interpretationError ? (
                <p style={{ fontSize: 12, color: "#FCA5A5", margin: 0 }}>{interpretationError}</p>
              ) : (
                <p style={{ fontSize: 12, color: "#7C8593", margin: 0, lineHeight: 1.6 }}>
                  Click <em>Generate Interpretation</em> for an AI-written summary of how these benchmarks affect underwriting.
                  Interpretation only runs when requested — it never overrides the deterministic flags above.
                </p>
              )}
            </Card>
          </div>

          {/* Deal Structure & Leverage card */}
          {analysis.deal_structure && (
            <DealStructureCard ds={analysis.deal_structure} />
          )}

          <p style={{ fontSize: 10, color: "#6B7280", textAlign: "center" as const, marginTop: 8 }}>
            Generated {new Date(analysis.generated_at).toLocaleString()} · Reproducible from saved inputs
          </p>
        </>
      )}

      {/* Mobile responsive collapse */}
      <style>{`
        @media (max-width: 880px) {
          .benchmarks-input-grid { grid-template-columns: 1fr !important; gap: 18px !important; }
          .benchmarks-panels-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function MetricTableRow({ row, last }: { row: MetricRow; last: boolean }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 0.9fr) minmax(0, 0.9fr) minmax(0, 0.7fr) auto minmax(0, 1.1fr)",
      gap: 14, alignItems: "center",
      padding: "16px 24px",
      borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.04)",
    }}>
      <div style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 500 }}>
        {row.metric_label}
      </div>
      <div style={{
        fontSize: 14, fontWeight: 700, color: "#F1F5F9", textAlign: "right" as const,
        fontFamily: "'JetBrains Mono',monospace",
      }}>
        {formatMetricValue(row.metric_key, row.deal_value)}
      </div>
      <div style={{
        fontSize: 13, color: "#7C8593", textAlign: "right" as const,
        fontFamily: "'JetBrains Mono',monospace",
      }}>
        {formatMetricValue(row.metric_key, row.industry_median)}
      </div>
      <div style={{ textAlign: "right" as const }}>
        {row.display_percentile !== null ? (
          <span style={{
            fontSize: 11, fontWeight: 600, color: "#A5B4FC",
            padding: "3px 9px", borderRadius: 6,
            background: "rgba(99,102,241,0.08)",
            fontFamily: "'JetBrains Mono',monospace",
          }}>
            {row.display_percentile}th
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "#6B7280" }}>—</span>
        )}
      </div>
      <div>
        <PercentileBar percentile={row.display_percentile} />
      </div>
      <div>
        <StatusBadge row={row} />
        {row.insufficient_data && row.reason && (
          <div style={{ fontSize: 10, color: "#6B7280", marginTop: 3, lineHeight: 1.4 }}>
            {row.reason}
          </div>
        )}
      </div>
    </div>
  );
}

function DealStructureCard({ ds }: { ds: DealStructureAnalysis }) {
  return (
    <Card>
      <SectionLabel>Acquisition Analysis</SectionLabel>
      <h3 style={{
        fontSize: 16, fontWeight: 700, margin: "0 0 4px",
        fontFamily: "'Inter Tight',sans-serif", color: "#F1F5F9",
      }}>
        Deal Structure & Leverage
      </h3>
      <p style={{ fontSize: 12, color: "#7C8593", margin: "0 0 18px" }}>
        Tests whether the acquisition structure can support the proposed debt — separate from operating benchmarks.
      </p>

      {/* Three metric tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 22 }} className="ds-metric-grid">
        {ds.metrics.map(m => (
          <DealStructureTile key={m.key} m={m} />
        ))}
      </div>

      {/* Sources & Uses + Flags + Interpretation */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="ds-bottom-grid">

        {/* Sources & Uses table */}
        <div>
          <SectionLabel>Sources &amp; Uses</SectionLabel>
          <div style={{ fontSize: 12, lineHeight: 1.7 }}>
            <SuRow label="Purchase Price"          value={ds.sources_uses.purchase_price} />
            <SuRow label="Working Capital Needed"  value={ds.sources_uses.working_capital_needed} />
            <SuRow label="Total Uses"              value={ds.sources_uses.total_uses} bold />
            <div style={{ height: 8 }} />
            <SuRow label="Buyer Equity" value={ds.sources_uses.buyer_equity} />
            <SuRow label="Senior Debt"  value={ds.sources_uses.senior_debt} />
            <SuRow label="Seller Note"  value={ds.sources_uses.seller_note} />
            <SuRow label="Total Sources" value={ds.sources_uses.total_sources} bold />
            <div style={{
              marginTop: 10, padding: "8px 10px", borderRadius: 8,
              background: ds.sources_uses.balanced ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
              border: `1px solid ${ds.sources_uses.balanced ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.25)"}`,
              fontSize: 11, color: ds.sources_uses.balanced ? "#6EE7B7" : "#FCD34D",
              fontWeight: 600,
            }}>
              {ds.sources_uses.balanced ? "✓ Sources & Uses balanced" : "⚠ Sources & Uses unbalanced — review structure"}
            </div>
          </div>
        </div>

        {/* What this means + leverage flags */}
        <div>
          <SectionLabel>What This Means</SectionLabel>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {ds.interpretation.map((line, i) => (
              <li key={i} style={{
                fontSize: 12, color: "#E2E8F0", lineHeight: 1.55,
                paddingLeft: 14, position: "relative",
              }}>
                <span style={{
                  position: "absolute", left: 0, top: 6,
                  width: 6, height: 6, borderRadius: "50%", background: "#A5B4FC",
                }} />
                {line}
              </li>
            ))}
          </ul>

          {ds.flags.length > 0 && (
            <>
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "14px 0" }} />
              <div style={{ fontSize: 10, color: "#FCA5A5", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 }}>
                Leverage Flags
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {ds.flags.map((f, i) => (
                  <li key={i} style={{ fontSize: 11, color: "#94A3B8", paddingLeft: 14, position: "relative", lineHeight: 1.55 }}>
                    <span style={{
                      position: "absolute", left: 0, top: 5,
                      width: 6, height: 6, borderRadius: "50%",
                      background: f.severity === "high" ? "#EF4444" : "#F59E0B",
                    }} />
                    {f.message}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .ds-metric-grid { grid-template-columns: 1fr !important; }
          .ds-bottom-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </Card>
  );
}

function DealStructureTile({ m }: { m: DealStructureMetric }) {
  const colorMap: Record<StatusColor, { bg: string; border: string; text: string }> = {
    red:    { bg: "rgba(239,68,68,0.06)",  border: "rgba(239,68,68,0.2)",  text: "#FCA5A5" },
    yellow: { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.2)", text: "#FCD34D" },
    blue:   { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.2)", text: "#93C5FD" },
    green:  { bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.2)", text: "#6EE7B7" },
  };
  const c = m.status_color ? colorMap[m.status_color] : { bg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.06)", text: "#7C8593" };
  return (
    <div style={{
      padding: "16px 18px", borderRadius: 12,
      background: c.bg, border: `1px solid ${c.border}`,
    }}>
      <div style={{ fontSize: 10, color: "#7C8593", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 }}>
        {m.label}
      </div>
      <div style={{
        fontSize: 28, fontWeight: 700, lineHeight: 1, color: "#F1F5F9",
        fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-0.02em",
        marginBottom: 8,
      }}>
        {m.display}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: c.text, marginBottom: 6 }}>
        {m.status}
      </div>
      <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.5 }}>
        {m.explanation}
      </div>
    </div>
  );
}

// ── Tiny helpers ─────────────────────────────────────────────────────────────

function ColHeader({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <div style={{
      fontSize: 10, color: "#7C8593", textTransform: "uppercase",
      letterSpacing: "0.08em", fontWeight: 600, textAlign: align as any,
    }}>
      {children}
    </div>
  );
}

function ContextField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{
        fontSize: 9, color: "#7C8593", textTransform: "uppercase",
        letterSpacing: "0.1em", fontWeight: 600, marginBottom: 3,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 600 }}>
        {value}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, color: "#7C8593", textTransform: "uppercase",
      letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {children}
    </div>
  );
}

function NumField({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <div style={{
        fontSize: 9, color: "#7C8593", textTransform: "uppercase",
        letterSpacing: "0.08em", fontWeight: 600, marginBottom: 4,
      }}>
        {label}
      </div>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "8px 10px", borderRadius: 8,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
          color: "#E2E8F0", fontSize: 13,
          fontFamily: "'JetBrains Mono',monospace",
        }}
      />
    </div>
  );
}

function SuRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      paddingTop: bold ? 6 : 0, borderTop: bold ? "1px solid rgba(255,255,255,0.06)" : "none",
      marginTop: bold ? 4 : 0,
    }}>
      <span style={{ color: bold ? "#F1F5F9" : "#94A3B8", fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ color: bold ? "#F1F5F9" : "#E2E8F0", fontWeight: bold ? 700 : 500, fontFamily: "'JetBrains Mono',monospace" }}>
        {fmt.bigMoney(value)}
      </span>
    </div>
  );
}

function ProGatedHint({ label, onUpgrade }: { label: string; onUpgrade?: () => void }) {
  return (
    <div style={{
      padding: "12px 14px", borderRadius: 10,
      background: "rgba(99,102,241,0.06)", border: "1px dashed rgba(99,102,241,0.3)",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ fontSize: 16 }}>🔒</span>
      <div style={{ flex: 1, fontSize: 12, color: "#94A3B8" }}>{label}</div>
      {onUpgrade && (
        <button
          onClick={onUpgrade}
          style={{
            padding: "4px 10px", borderRadius: 6, border: "none",
            background: "rgba(99,102,241,0.12)", color: "#A5B4FC",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
          }}
        >
          Upgrade
        </button>
      )}
    </div>
  );
}

function scoreColor(score: number | null): string {
  if (score === null) return "#6B7280";
  if (score >= 75) return "#10B981";
  if (score >= 55) return "#3B82F6";
  if (score >= 35) return "#F59E0B";
  return "#EF4444";
}

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 9,
  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
  color: "#E2E8F0", fontSize: 13, cursor: "pointer",
};
