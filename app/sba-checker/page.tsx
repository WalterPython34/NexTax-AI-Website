"use client";

import { useMemo, useState } from "react";
import { SBA_INDUSTRIES, SBA_INDUSTRY_BY_KEY } from "@/lib/sba/industries";
import type { SbaVerdict } from "@/lib/sba/sba-engine";
import type { OwnerRole } from "@/lib/sba/owner-comp-provider";
import type { SbaBreakdown, BreakdownLineItem } from "@/lib/sba/breakdown";

type ApiResponse =
  | {
      ok: true;
      verdict: SbaVerdict;
      replayToken: string | null;
      meta: {
        provider: string;
        providerLabel: string;
        ownerCompLabel: string;
        disclaimer: string;
        version: string;
      };
    }
  | { ok: false; reason: string };

type ViewState =
  | { kind: "idle" }
  | { kind: "sample" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "unrunnable"; reason: string }
  | { kind: "verdict"; data: Extract<ApiResponse, { ok: true }> };

const COLORS = {
  bg: "#0B0F17",
  panel: "rgba(255,255,255,0.025)",
  panelBorder: "rgba(255,255,255,0.06)",
  inputBg: "rgba(255,255,255,0.04)",
  inputBorder: "rgba(255,255,255,0.1)",
  text: "#E2E8F0",
  textDim: "#8896A6",
  textMute: "#6B7280",
  amber: "#F59E0B",
  buyer: "#94A3B8",
};

const CONF_COLORS: Record<string, string> = {
  High: "#10B981",
  Medium: "#F59E0B",
  Low: "#94A3B8",
};

const ZONE_META: Record<SbaVerdict["zone"], { color: string; headline: string; tag: string }> = {
  PASS: { color: "#10B981", headline: "Likely clears the 1.25\u00d7 lender screen", tag: "PASS" },
  BUBBLE: { color: "#F59E0B", headline: "Depends on add-back support", tag: "ON THE BUBBLE" },
  FAIL: { color: "#EF4444", headline: "Likely fails the 1.25\u00d7 lender screen", tag: "FAIL" },
};

const ACQUIFLOW_URL = "/";

const SAMPLE_RESULT: Extract<ApiResponse, { ok: true }> = {
  ok: true,
  replayToken: null,
  verdict: {
    zone: "BUBBLE",
    verdictConfidence: {
      level: "Low",
      reasons: ["The range straddles the 1.25x lender minimum — the verdict depends on how add-backs are documented."],
    },
    inputConfidence: {
      level: "High",
      reasons: ["Revenue, SDE, and industry are stated figures with benchmark-grounded inputs."],
    },
    buyerCaseDscr: 1.89,
    lenderDscrLow: 1.22,
    lenderDscrHigh: 1.28,
    lenderStart: 186450,
    lenderSdeLow: 177128,
    lenderSdeHigh: 186450,
    ownerComp: {
      value: 88550,
      provenance: "benchmark",
      groundingStrength: "full",
      grounding: "industry",
      providerId: "bls-oews-2025",
      source: "BLS_OEWS",
      release: "May 2025",
      soc: "11-9021",
      occupationLabel: "Construction Managers",
      band: "1m_3m",
      role: "operator",
    },
    addbackBand: { low: 0, high: 9323, marginAvailable: true },
    reportedMargin: 0.2,
    medianMargin: 0.23,
    annualDebtService: 145730,
    monthlyPayment: 12144,
    loanAmount: 900000,
  },
  meta: {
    provider: "bls-oews-2025",
    providerLabel: "BLS OEWS (May 2025 OEWS, role-matched)",
    ownerCompLabel: "benchmark owner replacement cost",
    disclaimer:
      "This is an underwriting screen, not a lender credit decision. The owner-comp benchmark is a market replacement-cost estimate; lenders may treat owner comp and add-backs differently.",
    version: "sba-check.v1",
  },
};

function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function ownerCompHint(oc: SbaVerdict["ownerComp"]): string {
  if (oc.provenance !== "benchmark") return "your assumption";
  const parts = [oc.occupationLabel, oc.release].filter(Boolean);
  return parts.length ? `benchmark · ${parts.join(" · ")}` : "benchmark-derived";
}

const ROLE_OPTIONS: { value: OwnerRole; label: string }[] = [
  { value: "operator", label: "Full-time operator" },
  { value: "operator_technical", label: "Operator + licensed trade" },
  { value: "passive", label: "Largely passive" },
];

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  color: COLORS.textDim,
  marginBottom: 5,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 8,
  border: `1px solid ${COLORS.inputBorder}`,
  background: COLORS.inputBg,
  color: COLORS.text,
  fontSize: 14,
  outline: "none",
  fontFamily: "'Inter', sans-serif",
};

export default function SbaCheckerPage() {
  const [industryKey, setIndustryKey] = useState("hvac");
  const [role, setRole] = useState<OwnerRole>("operator");
  const [revenue, setRevenue] = useState("$1,400,000");
  const [sde, setSde] = useState("$275,000");
  const [askingPrice, setAskingPrice] = useState("$1,000,000");
  const [downPayment, setDownPayment] = useState("10");
  const [rate, setRate] = useState("10.5");
  const [term, setTerm] = useState("10");
  const [showFinancing, setShowFinancing] = useState(false);
  const [view, setView] = useState<ViewState>({ kind: "sample" });

  const industries = useMemo(
    () => [...SBA_INDUSTRIES].sort((a, b) => a.label.localeCompare(b.label)),
    [],
  );

  async function runCheck() {
    const revenueN = parseMoney(revenue);
    const sdeN = parseMoney(sde);
    const priceN = parseMoney(askingPrice);
    const downN = parseMoney(downPayment);
    const rateN = parseMoney(rate);
    const termN = parseMoney(term);

    if (revenueN === null || sdeN === null || priceN === null) {
      setView({ kind: "unrunnable", reason: "Enter annual revenue, SDE, and asking price to run the screen." });
      return;
    }
    if (downN === null || rateN === null || termN === null) {
      setView({ kind: "unrunnable", reason: "Check the financing assumptions — down payment, rate, and term must be numbers." });
      return;
    }

    const medianMargin = SBA_INDUSTRY_BY_KEY[industryKey]?.sdeMarginMid ?? null;

    setView({ kind: "loading" });
    try {
      const res = await fetch("/api/sba-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reportedSde: sdeN,
          annualRevenue: revenueN,
          askingPrice: priceN,
          debtPercent: 100 - downN,
          ratePercent: rateN,
          termYears: termN,
          industryKey,
          role,
          medianMargin,
        }),
      });
      const data: ApiResponse = await res.json();
      if (!data.ok) {
        if (res.status === 200) setView({ kind: "unrunnable", reason: data.reason });
        else setView({ kind: "error", message: data.reason });
        return;
      }
      setView({ kind: "verdict", data });
    } catch {
      setView({ kind: "error", message: "Could not reach the underwriting screen. Try again." });
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ padding: "44px 24px 28px", textAlign: "center", background: "radial-gradient(ellipse at center top, rgba(245,158,11,0.06) 0%, transparent 60%)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 20, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)", fontSize: 11, color: COLORS.amber, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 18 }}>
          SBA Deal Check
        </div>
        <h1 style={{ fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 600, margin: "0 0 10px", fontFamily: "'Inter Tight', sans-serif", letterSpacing: "-0.02em", color: "#F1F5F9", lineHeight: 1.1 }}>
          Will your deal survive SBA underwriting?
        </h1>
        <p style={{ fontSize: 15, color: COLORS.textDim, maxWidth: 540, margin: "0 auto", lineHeight: 1.65 }}>
          A 60-second screen against the 1.25&times; debt-service coverage a lender looks for &mdash; after a benchmark owner replacement cost and a conservative add-back haircut.
        </p>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px 56px" }}>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 16, padding: "22px 22px 18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Industry</label>
              <select value={industryKey} onChange={(e) => setIndustryKey(e.target.value)} style={inputStyle}>
                {industries.map((i) => (
                  <option key={i.key} value={i.key} style={{ background: COLORS.bg }}>{i.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Annual revenue</label>
              <input value={revenue} onChange={(e) => setRevenue(e.target.value)} placeholder="$2,400,000" inputMode="numeric" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Seller-reported SDE</label>
              <input value={sde} onChange={(e) => setSde(e.target.value)} placeholder="$600,000" inputMode="numeric" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Asking price</label>
              <input value={askingPrice} onChange={(e) => setAskingPrice(e.target.value)} placeholder="$1,200,000" inputMode="numeric" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Owner&rsquo;s role</label>
              <select value={role} onChange={(e) => setRole(e.target.value as OwnerRole)} style={inputStyle}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value} style={{ background: COLORS.bg }}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button onClick={() => setShowFinancing((s) => !s)} style={{ marginTop: 16, background: "none", border: "none", color: COLORS.textDim, fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "'Inter', sans-serif" }}>
            {showFinancing ? "Hide" : "Adjust"} financing assumptions ({downPayment}% down &middot; {rate}% &middot; {term}yr)
          </button>

          {showFinancing && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 12 }}>
              <div>
                <label style={labelStyle}>Down payment %</label>
                <input value={downPayment} onChange={(e) => setDownPayment(e.target.value)} inputMode="decimal" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Interest rate %</label>
                <input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Term (years)</label>
                <input value={term} onChange={(e) => setTerm(e.target.value)} inputMode="decimal" style={inputStyle} />
              </div>
            </div>
          )}

          <button
            onClick={runCheck}
            disabled={view.kind === "loading"}
            style={{ width: "100%", marginTop: 18, padding: "13px 16px", borderRadius: 10, border: "none", background: COLORS.amber, color: "#1A1206", fontSize: 15, fontWeight: 600, cursor: view.kind === "loading" ? "default" : "pointer", opacity: view.kind === "loading" ? 0.7 : 1, fontFamily: "'Inter', sans-serif" }}
          >
            {view.kind === "loading" ? "Running the screen\u2026" : "Check SBA financeability"}
          </button>
        </div>

        {view.kind === "unrunnable" && (
          <div style={{ marginTop: 18, padding: "16px 18px", borderRadius: 12, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", color: "#FBBF77", fontSize: 14, lineHeight: 1.55 }}>
            {view.reason}
          </div>
        )}

        {view.kind === "error" && (
          <div style={{ marginTop: 18, padding: "16px 18px", borderRadius: 12, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#FCA5A5", fontSize: 14, lineHeight: 1.55 }}>
            {view.message}
          </div>
        )}

        {view.kind === "sample" && <ResultBlock data={SAMPLE_RESULT} sample />}
        {view.kind === "verdict" && <ResultBlock data={view.data} />}
      </div>
    </div>
  );
}

function Badge({ label, level }: { label: string; level: string }) {
  const c = CONF_COLORS[level] ?? COLORS.textDim;
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center", padding: "4px 10px", borderRadius: 8, background: `${c}1A`, border: `1px solid ${c}44`, fontSize: 11.5, fontWeight: 600, color: c, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />
      {label}: {level}
    </span>
  );
}

function ThresholdGauge({ verdict, zoneColor }: { verdict: SbaVerdict; zoneColor: string }) {
  const lo = verdict.lenderDscrLow;
  const hi = verdict.lenderDscrHigh;
  const buyer = verdict.buyerCaseDscr;

  const dMin = Math.min(lo, buyer, 1.0);
  const dMax = Math.max(hi, buyer, 1.5);
  const span = dMax - dMin;
  const pad = Math.max(span * 0.12, 0.1);
  const domainMin = Math.max(0, dMin - pad);
  const domainMax = dMax + pad;

  const X0 = 30;
  const X1 = 610;
  const W = X1 - X0;
  const xOf = (v: number) => {
    const t = (v - domainMin) / (domainMax - domainMin);
    return X0 + Math.max(0, Math.min(1, t)) * W;
  };
  const clampLabel = (x: number) => Math.max(X0 + 10, Math.min(X1 - 10, x));

  const bandX0 = xOf(lo);
  const bandX1 = xOf(hi);
  const bandW = Math.max(bandX1 - bandX0, 6);
  const bandMid = bandX0 + bandW / 2;
  const x125 = xOf(1.25);
  const bx = xOf(buyer);

  const refTicks = [1.0, 1.5].filter((t) => t >= domainMin && t <= domainMax);

  return (
    <svg viewBox="0 0 640 150" style={{ width: "100%", height: "auto", display: "block" }} xmlns="http://www.w3.org/2000/svg">
      <text x={clampLabel(x125)} y={22} textAnchor="middle" fill="#E2E8F0" fontSize={11} fontWeight={600} fontFamily="'Inter', sans-serif">1.25&#215; lender min</text>
      <line x1={x125} y1={30} x2={x125} y2={104} stroke="#E2E8F0" strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="3 3" />

      <text x={clampLabel(bx)} y={52} textAnchor="middle" fill={COLORS.buyer} fontSize={11.5} fontWeight={600} fontFamily="'Inter', sans-serif">Buyer-case {buyer.toFixed(2)}&#215;</text>
      <path d={`M ${bx - 5} 60 L ${bx + 5} 60 L ${bx} 67 Z`} fill={COLORS.buyer} />
      <line x1={bx} y1={67} x2={bx} y2={84} stroke={COLORS.buyer} strokeWidth={1.5} />

      <line x1={X0} y1={92} x2={X1} y2={92} stroke="rgba(255,255,255,0.12)" strokeWidth={2} strokeLinecap="round" />

      {refTicks.map((t) => (
        <g key={t}>
          <line x1={xOf(t)} y1={87} x2={xOf(t)} y2={97} stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
          <text x={clampLabel(xOf(t))} y={112} textAnchor="middle" fill={COLORS.textMute} fontSize={10.5} fontFamily="'Inter', sans-serif">{t.toFixed(2)}&#215;</text>
        </g>
      ))}

      <rect x={bandX0} y={84} width={bandW} height={16} rx={4} fill={zoneColor} fillOpacity={0.85} stroke={zoneColor} strokeWidth={1} />
      <text x={clampLabel(bandMid)} y={128} textAnchor="middle" fill={zoneColor} fontSize={12} fontWeight={600} fontFamily="'Inter', sans-serif">
        Lender range: {lo.toFixed(2)}&#8211;{hi.toFixed(2)}&#215;
      </text>
    </svg>
  );
}

function ReasonList({ title, reasons }: { title: string; reasons: string[] }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 16, color: COLORS.textMute, fontSize: 12.5, lineHeight: 1.5 }}>
        {reasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "#F1F5F9", fontFamily: "'Inter Tight', sans-serif" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: COLORS.textMute, marginTop: 2 }}>{hint}</div>
    </div>
  );
}

function ResultBlock({ data, sample }: { data: Extract<ApiResponse, { ok: true }>; sample?: boolean }) {
  return (
    <>
      <VerdictCard data={data} sample={sample} />
      <BreakdownGate token={data.replayToken} sample={sample} />
      <ResultCta />
    </>
  );
}


// ─── Gated add-back breakdown ────────────────────────────────────────────────

type BreakdownResponse = { ok: true; breakdown: SbaBreakdown } | { ok: false; reason: string };

type GateState =
  | { kind: "locked" }
  | { kind: "sending" }
  | { kind: "gateError"; message: string }
  | { kind: "revealed"; breakdown: SbaBreakdown };

const BASIS_META: Record<BreakdownLineItem["basis"], { label: string; color: string }> = {
  input: { label: "INPUT", color: "#94A3B8" },
  benchmark: { label: "BENCHMARK", color: "#38BDF8" },
  derived: { label: "DERIVED", color: COLORS.amber },
  policy: { label: "POLICY", color: "#A78BFA" },
};

function formatLineValue(li: BreakdownLineItem): string {
  switch (li.kind) {
    case "money":
      return li.value !== undefined ? money(li.value) : "\u2014";
    case "moneyRange":
      return li.low !== undefined && li.high !== undefined ? `${money(li.low)} \u2013 ${money(li.high)}` : "\u2014";
    case "ratio":
      return li.value !== undefined ? `${li.value}\u00d7` : "\u2014";
    case "ratioRange":
      return li.low !== undefined && li.high !== undefined ? `${li.low} \u2013 ${li.high}\u00d7` : "\u2014";
  }
}

function BreakdownGate({ token, sample }: { token: string | null; sample?: boolean }) {
  const [gate, setGate] = useState<GateState>({ kind: "locked" });
  const [email, setEmail] = useState("");

  async function unlock() {
    if (!token) return;
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setGate({ kind: "gateError", message: "Enter a valid email to unlock the breakdown." });
      return;
    }
    setGate({ kind: "sending" });
    try {
      const res = await fetch("/api/sba-check/breakdown", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed, replayToken: token, source: "sba-checker" }),
      });
      const data: BreakdownResponse = await res.json();
      if (!data.ok) {
        setGate({ kind: "gateError", message: data.reason });
        return;
      }
      setGate({ kind: "revealed", breakdown: data.breakdown });
    } catch {
      setGate({ kind: "gateError", message: "Could not load the breakdown. Try again." });
    }
  }

  if (gate.kind === "revealed") return <BreakdownCard breakdown={gate.breakdown} />;

  const disabled = sample || !token;

  return (
    <div style={{ marginTop: 14, background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 16, padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span aria-hidden style={{ fontSize: 15 }}>{"\u{1F512}"}</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#F1F5F9" }}>See the line-by-line add-back breakdown</span>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: COLORS.textDim, lineHeight: 1.6 }}>
        The full derivation behind this verdict: the owner-comp haircut, the add-back band a lender may credit,
        the lender-view SDE range, debt service, and a plain-English read of what decides this screen.
      </p>
      {disabled ? (
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px dashed ${COLORS.panelBorder}`, fontSize: 13, color: COLORS.textMute }}>
          {sample
            ? "Run the screen with your own numbers first \u2014 then unlock the breakdown with your email."
            : "The breakdown is unavailable right now. Re-run the screen and try again."}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") unlock(); }}
              placeholder="you@company.com"
              style={{ ...inputStyle, flex: "1 1 220px" }}
              disabled={gate.kind === "sending"}
            />
            <button
              onClick={unlock}
              disabled={gate.kind === "sending"}
              style={{ padding: "11px 20px", borderRadius: 8, border: "none", background: COLORS.amber, color: "#0B0F17", fontSize: 14, fontWeight: 700, cursor: gate.kind === "sending" ? "wait" : "pointer", fontFamily: "'Inter', sans-serif" }}
            >
              {gate.kind === "sending" ? "Unlocking\u2026" : "Unlock breakdown"}
            </button>
          </div>
          {gate.kind === "gateError" && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: "#FCA5A5" }}>{gate.message}</div>
          )}
          <p style={{ margin: "10px 0 0", fontSize: 11.5, color: COLORS.textMute }}>
            Free. We&rsquo;ll send occasional SBA-buyer underwriting notes &mdash; no spam, unsubscribe anytime.
          </p>
        </>
      )}
    </div>
  );
}

function BreakdownCard({ breakdown }: { breakdown: SbaBreakdown }) {
  return (
    <div style={{ marginTop: 14, background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "16px 22px", borderBottom: `1px solid ${COLORS.panelBorder}` }}>
        <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.textMute, fontWeight: 700, marginBottom: 8 }}>
          What decides this screen
        </div>
        <p style={{ margin: 0, fontSize: 14.5, color: "#F1F5F9", lineHeight: 1.65 }}>{breakdown.interpretation.killLine}</p>
      </div>

      <div style={{ padding: "10px 22px 16px" }}>
        {breakdown.lineItems.map((li) => {
          const basis = BASIS_META[li.basis];
          return (
            <div key={li.id} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, padding: "10px 0", borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13.5, color: "#E2E8F0" }}>{li.label}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em", color: basis.color, border: `1px solid ${basis.color}44`, background: `${basis.color}14`, borderRadius: 5, padding: "2px 6px" }}>
                    {basis.label}
                  </span>
                </div>
                {li.note && <div style={{ fontSize: 11.5, color: COLORS.textMute, marginTop: 3 }}>{li.note}</div>}
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#F1F5F9", whiteSpace: "nowrap" }}>{formatLineValue(li)}</span>
            </div>
          );
        })}
      </div>

      <div style={{ padding: "12px 22px 16px", background: "rgba(255,255,255,0.015)", borderTop: `1px solid ${COLORS.panelBorder}` }}>
        <p style={{ margin: 0, fontSize: 11.5, color: COLORS.textMute, lineHeight: 1.55 }}>{breakdown.disclaimer}</p>
      </div>
    </div>
  );
}

function ResultCta() {
  return (
    <a href={ACQUIFLOW_URL} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 14, padding: "16px 20px", borderRadius: 14, background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.22)", textDecoration: "none" }}>
      <span style={{ fontSize: 14, color: "#F1F5F9", lineHeight: 1.5 }}>
        Want the full lender-view report? <span style={{ color: COLORS.amber, fontWeight: 600 }}>Run this deal in AcquiFlow.</span>
      </span>
      <span style={{ color: COLORS.amber, fontSize: 18, fontWeight: 600 }}>&rarr;</span>
    </a>
  );
}

function VerdictCard({ data, sample }: { data: Extract<ApiResponse, { ok: true }>; sample?: boolean }) {
  const { verdict, meta } = data;
  const zone = ZONE_META[verdict.zone];

  return (
    <div style={{ marginTop: 20, background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "18px 22px", borderBottom: `1px solid ${COLORS.panelBorder}`, borderTop: `3px solid ${zone.color}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ padding: "5px 12px", borderRadius: 8, background: `${zone.color}1A`, border: `1px solid ${zone.color}55`, color: zone.color, fontSize: 13, fontWeight: 700, letterSpacing: "0.04em" }}>
              {zone.tag}
            </span>
            <span style={{ fontSize: 16, fontWeight: 600, color: "#F1F5F9" }}>{zone.headline}</span>
            {sample && (
              <span style={{ padding: "3px 9px", borderRadius: 6, background: "rgba(255,255,255,0.06)", border: `1px solid ${COLORS.panelBorder}`, color: COLORS.textDim, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Sample
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Badge label="Verdict" level={verdict.verdictConfidence.level} />
            <Badge label="Input Quality" level={verdict.inputConfidence.level} />
          </div>
        </div>
      </div>

      {sample && (
        <div style={{ padding: "8px 22px", fontSize: 12, color: COLORS.textDim, background: "rgba(255,255,255,0.015)", borderBottom: `1px solid ${COLORS.panelBorder}` }}>
          Example deal &mdash; edit the numbers above and re-run for your own.
        </div>
      )}

      <div style={{ padding: "20px 22px 6px" }}>
        <ThresholdGauge verdict={verdict} zoneColor={zone.color} />
      </div>

      <div style={{ padding: "10px 22px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Metric label={meta.ownerCompLabel} value={money(verdict.ownerComp.value)} hint={ownerCompHint(verdict.ownerComp)} />
        <Metric label="Add-back haircut tested" value={`${money(verdict.addbackBand.low)} \u2013 ${money(verdict.addbackBand.high)}`} hint="conservative band" />
      </div>

      <div style={{ padding: "0 22px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <ReasonList title="Why this verdict" reasons={verdict.verdictConfidence.reasons} />
        <ReasonList title="Why this input confidence" reasons={verdict.inputConfidence.reasons} />
      </div>

      <div style={{ padding: "14px 22px", borderTop: `1px solid ${COLORS.panelBorder}`, background: "rgba(255,255,255,0.015)" }}>
        <p style={{ margin: 0, fontSize: 12, color: COLORS.textMute, lineHeight: 1.55 }}>{meta.disclaimer}</p>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: COLORS.textDim, lineHeight: 1.55 }}>
          This is the same underwriting engine used inside AcquiFlow&rsquo;s full acquisition analysis.
        </p>
      </div>
    </div>
  );
}
