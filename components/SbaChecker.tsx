// components/SbaChecker.tsx
// Shared SBA Deal Check component with per-partner theming.
//
// Routes:
//   /sba-checker     -> no partner. DARK theme. Email gate on. Reddit/UTM lead
//                       capture preserved exactly as before.
//   /smbdealhunter   -> partner config. LIGHT theme (matches the partner
//                       ecosystem), email gate bypassed (server-verified),
//                       partner_ref stamped, co-brand strip with a reserved
//                       logo slot in the hero.
//
// Theming: every color routes through an SbaTheme object provided via context.
// Zone colors (PASS/BUBBLE/FAIL) are shared constants that hold contrast on
// both backgrounds. Adding a future partner theme means adding one object.
//
// Both routes stash the typed deal into localStorage on the AcquiFlow CTA so
// the buyer dashboard can pre-fill the analyze modal after signup
// (nxtax_pending_deal, picked up in app/buyer-dashboard/page.tsx).

"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SBA_INDUSTRIES, SBA_INDUSTRY_BY_KEY } from "@/lib/sba/industries";
import type { SbaVerdict } from "@/lib/sba/sba-engine";
import type { OwnerRole } from "@/lib/sba/owner-comp-provider";
import type { SbaBreakdown, BreakdownLineItem } from "@/lib/sba/breakdown";
import { PARTNER_COMMERCE } from "@/lib/partners";

// ─── Theme ────────────────────────────────────────────────────────────────────

interface SbaTheme {
  mode: "dark" | "light";
  bg: string;
  heroGlow: string;
  panel: string;
  panelBorder: string;
  inputBg: string;
  inputBorder: string;
  heading: string;
  text: string;
  textDim: string;
  textMute: string;
  amber: string;
  amberText: string;
  onAmber: string;
  buyer: string;
  gaugeText: string;
  gaugeTrack: string;
  gaugeTick: string;
  rowBorder: string;
  insetBg: string;
  chipBg: string;
  successText: string;
  warnText: string;
  dangerText: string;
  confLow: string;
  basisInput: string;
  basisBenchmark: string;
  basisPolicy: string;
}

const DARK_THEME: SbaTheme = {
  mode: "dark",
  bg: "#0B0F17",
  heroGlow: "rgba(245,158,11,0.06)",
  panel: "rgba(255,255,255,0.025)",
  panelBorder: "rgba(255,255,255,0.06)",
  inputBg: "rgba(255,255,255,0.04)",
  inputBorder: "rgba(255,255,255,0.1)",
  heading: "#F1F5F9",
  text: "#E2E8F0",
  textDim: "#8896A6",
  textMute: "#6B7280",
  amber: "#F59E0B",
  amberText: "#F59E0B",
  onAmber: "#1A1206",
  buyer: "#94A3B8",
  gaugeText: "#E2E8F0",
  gaugeTrack: "rgba(255,255,255,0.12)",
  gaugeTick: "rgba(255,255,255,0.25)",
  rowBorder: "rgba(255,255,255,0.05)",
  insetBg: "rgba(255,255,255,0.015)",
  chipBg: "rgba(255,255,255,0.06)",
  successText: "#34D399",
  warnText: "#FBBF77",
  dangerText: "#FCA5A5",
  confLow: "#94A3B8",
  basisInput: "#94A3B8",
  basisBenchmark: "#38BDF8",
  basisPolicy: "#A78BFA",
};

const LIGHT_THEME: SbaTheme = {
  mode: "light",
  bg: "#FFFFFF",
  heroGlow: "rgba(245,158,11,0.05)",
  panel: "#FBFBFC",
  panelBorder: "#E9EBEF",
  inputBg: "#FFFFFF",
  inputBorder: "#DCDFE5",
  heading: "#141A22",
  text: "#1F2733",
  textDim: "#5C6470",
  textMute: "#8A909B",
  amber: "#F59E0B",
  amberText: "#854F0B",
  onAmber: "#1A1206",
  buyer: "#64748B",
  gaugeText: "#334155",
  gaugeTrack: "rgba(15,23,42,0.10)",
  gaugeTick: "rgba(15,23,42,0.28)",
  rowBorder: "rgba(15,23,42,0.06)",
  insetBg: "rgba(15,23,42,0.02)",
  chipBg: "rgba(15,23,42,0.04)",
  successText: "#0F6E56",
  warnText: "#854F0B",
  dangerText: "#A32D2D",
  confLow: "#64748B",
  basisInput: "#64748B",
  basisBenchmark: "#0369A1",
  basisPolicy: "#7C3AED",
};

const ThemeContext = createContext<SbaTheme>(DARK_THEME);
function useT(): SbaTheme {
  return useContext(ThemeContext);
}

// ─── Partner configuration ────────────────────────────────────────────────────

export interface SbaPartnerConfig {
  slug: string;         // stable id, also the whitelist key server-side
  displayName: string;  // shown in the co-brand strip
  gateBypass: boolean;  // breakdown renders without the email gate
  theme: "dark" | "light";
}

export const SBA_PARTNERS: Record<string, SbaPartnerConfig> = {
  smbdealhunter: {
    slug: "smbdealhunter",
    // Single source: identity comes from lib/partners so the checker, the
    // signin strip, and the checkout can never disagree.
    displayName: PARTNER_COMMERCE.smbdealhunter.displayName,
    gateBypass: true,
    theme: "light",
  },
};

// Checker industryKey -> AcquiFlow SCORE_INDUSTRIES key, for the prefill stash.
// Only add entries where the key names DIFFER; anything not listed passes
// through unchanged. The dashboard drops unknown keys safely, so a missing
// mapping degrades to "user picks the industry in the modal", never an error.
const SBA_TO_ACQUIFLOW_INDUSTRY: Record<string, string> = {
  // example: construction_managers: "construction",
};

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

// Zone and confidence colors hold contrast on both themes.
const CONF_COLORS: Record<string, string> = {
  High: "#10B981",
  Medium: "#F59E0B",
};

const ZONE_META: Record<SbaVerdict["zone"], { color: string; headline: string; tag: string }> = {
  PASS: { color: "#10B981", headline: "Likely clears the 1.25\u00d7 lender screen", tag: "PASS" },
  BUBBLE: { color: "#F59E0B", headline: "Depends on add-back support", tag: "ON THE BUBBLE" },
  FAIL: { color: "#EF4444", headline: "Likely fails the 1.25\u00d7 lender screen", tag: "FAIL" },
};

const ACQUIFLOW_URL = "/acquiflow";

const SAMPLE_RESULT: Extract<ApiResponse, { ok: true }> = {
  ok: true,
  replayToken: null,
  verdict: {
    zone: "BUBBLE",
    verdictConfidence: {
      level: "Low",
      reasons: ["The range straddles the 1.25\u00d7 lender minimum: the verdict depends on how add-backs are documented."],
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

/** Normalize a money input on blur: "550000" -> "$550,000". Invalid input is left as typed. */
function formatMoneyInput(raw: string): string {
  const n = parseMoney(raw);
  return n !== null ? `$${n.toLocaleString("en-US")}` : raw;
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

function labelStyle(T: SbaTheme): React.CSSProperties {
  return {
    display: "block",
    fontSize: 11,
    color: T.textDim,
    marginBottom: 5,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };
}

function inputStyle(T: SbaTheme): React.CSSProperties {
  return {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 8,
    border: `1px solid ${T.inputBorder}`,
    background: T.inputBg,
    color: T.text,
    fontSize: 14,
    outline: "none",
    fontFamily: "'Inter', sans-serif",
  };
}

export default function SbaChecker({ partner }: { partner?: SbaPartnerConfig }) {
  const T = partner?.theme === "light" ? LIGHT_THEME : DARK_THEME;

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

  // Partner attribution: stamp the ref so signup can attribute even if the
  // user never clicks the CTA on this visit. The buyer dashboard persists it
  // to partner_attributions on first authenticated load, then clears it.
  useEffect(() => {
    if (!partner) return;
    try { localStorage.setItem("nxtax_partner_ref", partner.slug); } catch { /* non-fatal */ }
  }, [partner]);

  // On mobile the verdict renders below the fold; bring it into view on a live run.
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (view.kind !== "verdict") return;
    const t = setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => clearTimeout(t);
  }, [view.kind]);

  // AcquiFlow handoff: stash the typed deal so the buyer dashboard can
  // pre-fill the analyze modal after signup. Values are normalized to plain
  // numeric strings; the industry key is mapped where names differ and the
  // dashboard drops anything it does not recognize.
  function stashDealForAcquiflow() {
    try {
      const payload: Record<string, string> = {};
      const norm = (v: string) => {
        const n = parseMoney(v);
        return n !== null && n > 0 ? String(n) : "";
      };
      const rev = norm(revenue);
      const s = norm(sde);
      const price = norm(askingPrice);
      if (rev) payload.revenue = rev;
      if (s) payload.sde = s;
      if (price) payload.askingPrice = price;
      const mapped = SBA_TO_ACQUIFLOW_INDUSTRY[industryKey] ?? industryKey;
      if (mapped) payload.industry = mapped;
      if (Object.keys(payload).length > 0) {
        localStorage.setItem("nxtax_pending_deal", JSON.stringify(payload));
      }
    } catch { /* non-fatal: user just re-types in the modal */ }
  }

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
    <ThemeContext.Provider value={T}>
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter', sans-serif" }}>
      {/* Slim co-brand header. The global site nav and footer hide on partner
           routes via SiteChromeGate, so this page is a self-contained surface. */}
     {partner && (
          <div style={{ marginBottom: 14 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 20, background: "rgba(16,185,129,0.09)", border: "1px solid rgba(16,185,129,0.25)", fontSize: 11.5, color: T.successText, fontWeight: 600 }}>
              For {partner.displayName} members · full breakdown unlocked · member pricing at signup
            </span>
          </div>
        )}
      <div style={{ padding: "44px 24px 28px", textAlign: "center", background: `radial-gradient(ellipse at center top, ${T.heroGlow} 0%, transparent 60%)` }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 20, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.22)", fontSize: 11, color: T.amberText, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 18 }}>
          SBA Deal Check
        </div>
       {partner && (
        <header style={{
          position: "sticky", top: 0, zIndex: 40,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          padding: "13px 24px",
          background: T.bg,
          borderBottom: `1px solid ${T.panelBorder}`,
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.heading, fontFamily: "'Inter Tight', sans-serif" }}>AcquiFlow</span>
          <span style={{ color: T.textMute, fontSize: 13 }}>&times;</span>
          <span style={{
            fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em", whiteSpace: "nowrap",
            fontFamily: "'Inter Tight', sans-serif",
            color: (partner as { brandColor?: string | null }).brandColor ?? T.heading,
          }}>
            {partner.displayName}
          </span>
        </header>
      )}
        <h1 style={{ fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 600, margin: "0 0 10px", fontFamily: "'Inter Tight', sans-serif", letterSpacing: "-0.02em", color: T.heading, lineHeight: 1.1 }}>
          Will your deal survive SBA underwriting?
        </h1>
        <p style={{ fontSize: 15, color: T.textDim, maxWidth: 540, margin: "0 auto", lineHeight: 1.65 }}>
          A 60-second screen against the 1.25&times; debt-service coverage a lender looks for &mdash; after a benchmark owner replacement cost and a conservative add-back haircut.
        </p>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px 56px" }}>
        <div style={{ background: T.panel, border: `1px solid ${T.panelBorder}`, borderRadius: 16, padding: "22px 22px 18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle(T)}>Industry</label>
              <select value={industryKey} onChange={(e) => setIndustryKey(e.target.value)} style={inputStyle(T)}>
                {industries.map((i) => (
                  <option key={i.key} value={i.key} style={{ background: T.bg }}>{i.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle(T)}>Annual revenue</label>
              <input value={revenue} onChange={(e) => setRevenue(e.target.value)} onBlur={() => setRevenue(formatMoneyInput(revenue))} placeholder="$2,400,000" inputMode="numeric" style={inputStyle(T)} />
            </div>
            <div>
              <label style={labelStyle(T)}>Seller-reported SDE</label>
              <input value={sde} onChange={(e) => setSde(e.target.value)} onBlur={() => setSde(formatMoneyInput(sde))} placeholder="$600,000" inputMode="numeric" style={inputStyle(T)} />
            </div>
            <div>
              <label style={labelStyle(T)}>Asking price</label>
              <input value={askingPrice} onChange={(e) => setAskingPrice(e.target.value)} onBlur={() => setAskingPrice(formatMoneyInput(askingPrice))} placeholder="$1,200,000" inputMode="numeric" style={inputStyle(T)} />
            </div>
            <div>
              <label style={labelStyle(T)}>Owner&rsquo;s role</label>
              <select value={role} onChange={(e) => setRole(e.target.value as OwnerRole)} style={inputStyle(T)}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value} style={{ background: T.bg }}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button onClick={() => setShowFinancing((s) => !s)} style={{ marginTop: 16, background: "none", border: "none", color: T.amberText, fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "'Inter', sans-serif", textDecoration: "underline", textUnderlineOffset: 3 }}>
            <span style={{ display: "inline-block", marginRight: 6, transform: showFinancing ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>&#9656;</span>
            {showFinancing ? "Hide" : "Adjust"} financing assumptions ({downPayment}% down &middot; {rate}% &middot; {term}yr)
          </button>

          {showFinancing && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 12 }}>
              <div>
                <label style={labelStyle(T)}>Down payment %</label>
                <input value={downPayment} onChange={(e) => setDownPayment(e.target.value)} inputMode="decimal" style={inputStyle(T)} />
              </div>
              <div>
                <label style={labelStyle(T)}>Interest rate %</label>
                <input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" style={inputStyle(T)} />
              </div>
              <div>
                <label style={labelStyle(T)}>Term (years)</label>
                <input value={term} onChange={(e) => setTerm(e.target.value)} inputMode="decimal" style={inputStyle(T)} />
              </div>
            </div>
          )}

          <button
            onClick={runCheck}
            disabled={view.kind === "loading"}
            style={{ width: "100%", marginTop: 18, padding: "13px 16px", borderRadius: 10, border: "none", background: T.amber, color: T.onAmber, fontSize: 15, fontWeight: 600, cursor: view.kind === "loading" ? "default" : "pointer", opacity: view.kind === "loading" ? 0.7 : 1, fontFamily: "'Inter', sans-serif" }}
          >
            {view.kind === "loading" ? "Running the screen\u2026" : "Check SBA financeability"}
          </button>
        </div>

        {view.kind === "unrunnable" && (
          <div style={{ marginTop: 18, padding: "16px 18px", borderRadius: 12, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", color: T.warnText, fontSize: 14, lineHeight: 1.55 }}>
            {view.reason}
          </div>
        )}

        {view.kind === "error" && (
          <div style={{ marginTop: 18, padding: "16px 18px", borderRadius: 12, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: T.dangerText, fontSize: 14, lineHeight: 1.55 }}>
            {view.message}
          </div>
        )}

        {view.kind === "sample" && <ResultBlock data={SAMPLE_RESULT} sample partner={partner} onAcquiflowClick={stashDealForAcquiflow} />}
        {view.kind === "verdict" && (
          <div ref={resultRef} style={{ scrollMarginTop: 90 }}>
            <ResultBlock data={view.data} partner={partner} onAcquiflowClick={stashDealForAcquiflow} />
          </div>
        )}
      </div>
    </div>
    </ThemeContext.Provider>
  );
}

function Badge({ label, level }: { label: string; level: string }) {
  const T = useT();
  const c = CONF_COLORS[level] ?? T.confLow;
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center", padding: "4px 10px", borderRadius: 8, background: `${c}1A`, border: `1px solid ${c}44`, fontSize: 11.5, fontWeight: 600, color: c, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />
      {label}: {level}
    </span>
  );
}

function ThresholdGauge({ verdict, zoneColor }: { verdict: SbaVerdict; zoneColor: string }) {
  const T = useT();
  const lo = verdict.lenderDscrLow;
  const hi = verdict.lenderDscrHigh;
  const buyer = verdict.buyerCaseDscr;

  // Coherent scale: even ticks spanning everything on screen, snapped outward
  // to the tick step so the axis always starts and ends on a labeled value.
  const rawMin = Math.min(lo, buyer, 1.0);
  const rawMax = Math.max(hi, buyer, 1.5);
  const step = rawMax - rawMin > 3 ? 1 : 0.5;
  const domainMin = Math.max(0, Math.floor(rawMin / step) * step);
  const domainMax = Math.ceil(rawMax / step) * step;

  const X0 = 40;
  const X1 = 600;
  const W = X1 - X0;
  const xOf = (v: number) => X0 + ((v - domainMin) / (domainMax - domainMin)) * W;
  const clampLabel = (x: number) => Math.max(X0 + 14, Math.min(X1 - 14, x));

  const AXIS_Y = 96;
  const ticks: number[] = [];
  for (let t = domainMin; t <= domainMax + 1e-9; t += step) ticks.push(Number(t.toFixed(2)));

  const bandX0 = xOf(lo);
  const bandW = Math.max(xOf(hi) - bandX0, 6);
  const bandMid = bandX0 + bandW / 2;
  const x125 = xOf(1.25);
  const bx = xOf(buyer);

  return (
    <svg viewBox="0 0 640 156" style={{ width: "100%", height: "auto", display: "block" }} xmlns="http://www.w3.org/2000/svg">
      {/* 1.25x lender minimum: labeled vertical line anchored to the axis */}
      <text x={clampLabel(x125)} y={20} textAnchor="middle" fill={T.gaugeText} fontSize={11} fontWeight={600} fontFamily="'Inter', sans-serif">1.25&#215; lender min</text>
      <line x1={x125} y1={26} x2={x125} y2={AXIS_Y + 10} stroke={T.gaugeText} strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray="3 3" />

      {/* Buyer-case marker: dot ON the axis, callout above with a leader line */}
      <text x={clampLabel(bx)} y={48} textAnchor="middle" fill={T.buyer} fontSize={11.5} fontWeight={600} fontFamily="'Inter', sans-serif">Buyer-case {buyer.toFixed(2)}&#215;</text>
      <line x1={bx} y1={54} x2={bx} y2={AXIS_Y - 7} stroke={T.buyer} strokeWidth={1.2} strokeDasharray="2 3" />

      {/* Axis with even ticks */}
      <line x1={X0} y1={AXIS_Y} x2={X1} y2={AXIS_Y} stroke={T.gaugeTrack} strokeWidth={2} strokeLinecap="round" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={xOf(t)} y1={AXIS_Y - 5} x2={xOf(t)} y2={AXIS_Y + 5} stroke={T.gaugeTick} strokeWidth={1.5} />
          <text x={xOf(t)} y={AXIS_Y + 22} textAnchor="middle" fill={T.textMute} fontSize={10.5} fontFamily="'Inter', sans-serif">{t.toFixed(step < 1 ? 1 : 0)}&#215;</text>
        </g>
      ))}

      {/* Lender-view range: band straddling the axis */}
      <rect x={bandX0} y={AXIS_Y - 7} width={bandW} height={14} rx={4} fill={zoneColor} fillOpacity={0.85} stroke={zoneColor} strokeWidth={1} />
      <text x={clampLabel(bandMid)} y={AXIS_Y + 42} textAnchor="middle" fill={zoneColor} fontSize={12} fontWeight={600} fontFamily="'Inter', sans-serif">
        Lender range: {lo.toFixed(2)}&#8211;{hi.toFixed(2)}&#215;
      </text>

      {/* Buyer dot drawn last so it sits above the band when they overlap */}
      <circle cx={bx} cy={AXIS_Y} r={5.5} fill={T.buyer} stroke={T.bg} strokeWidth={2} />
    </svg>
  );
}

function ReasonList({ title, reasons }: { title: string; reasons: string[] }) {
  const T = useT();
  return (
    <div>
      <div style={{ fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 16, color: T.textMute, fontSize: 12.5, lineHeight: 1.5 }}>
        {reasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  const T = useT();
  return (
    <div>
      <div style={{ fontSize: 11, color: T.textDim, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: T.heading, fontFamily: "'Inter Tight', sans-serif" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: T.textMute, marginTop: 2 }}>{hint}</div>
    </div>
  );
}

function ResultBlock({ data, sample, partner, onAcquiflowClick }: { data: Extract<ApiResponse, { ok: true }>; sample?: boolean; partner?: SbaPartnerConfig; onAcquiflowClick: () => void }) {
  return (
    <>
      <VerdictCard data={data} sample={sample} />
      <BreakdownGate token={data.replayToken} sample={sample} partner={partner} />
      <ResultCta zone={data.verdict.zone} partner={partner} onAcquiflowClick={onAcquiflowClick} />
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

function buildLeadSource(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source");
    const utmMedium = params.get("utm_medium");
    const utmCampaign = params.get("utm_campaign");
    if (utmSource) {
      const utm = [utmSource, utmMedium, utmCampaign].filter(Boolean).join("/");
      return `sba-checker utm:${utm}`.slice(0, 120);
    }
    if (document.referrer) {
      const host = new URL(document.referrer).hostname;
      if (host && host !== window.location.hostname) {
        return `sba-checker ref:${host}`.slice(0, 120);
      }
    }
  } catch {
    /* fall through to default */
  }
  return "sba-checker";
}

function BreakdownGate({ token, sample, partner }: { token: string | null; sample?: boolean; partner?: SbaPartnerConfig }) {
  const T = useT();
  const [gate, setGate] = useState<GateState>({ kind: "locked" });
  const [email, setEmail] = useState("");

  const partnerBypass = !!partner?.gateBypass;

  // Partner mode: auto-fetch the breakdown as soon as a live token exists.
  // Server-side whitelist enforces this; the client just skips the form.
  const partnerFetchedRef = useRef(false);
  useEffect(() => {
    if (!partnerBypass || sample || !token) return;
    if (partnerFetchedRef.current) return;
    partnerFetchedRef.current = true;
    void partnerUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerBypass, sample, token]);

  async function partnerUnlock() {
    if (!token || !partner) return;
    setGate({ kind: "sending" });
    try {
      const res = await fetch("/api/sba-check/breakdown", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ replayToken: token, partner: partner.slug, source: `partner:${partner.slug}` }),
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
        body: JSON.stringify({ email: trimmed, replayToken: token, source: buildLeadSource() }),
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

  // Partner mode UI: no email form. Loading, error with retry, or the sample note.
  if (partnerBypass) {
    return (
      <div style={{ marginTop: 14, background: T.panel, border: `1px solid ${T.panelBorder}`, borderRadius: 16, padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: T.heading }}>Line-by-line add-back breakdown</span>
          <span style={{ padding: "3px 9px", borderRadius: 6, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: T.successText, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Member access
          </span>
        </div>
        {sample ? (
          <p style={{ margin: 0, fontSize: 13, color: T.textMute, lineHeight: 1.6 }}>
            Run the screen with your own numbers and the full breakdown appears here automatically.
          </p>
        ) : gate.kind === "sending" ? (
          <p style={{ margin: 0, fontSize: 13, color: T.textDim, lineHeight: 1.6 }}>Loading the member breakdown&hellip;</p>
        ) : gate.kind === "gateError" ? (
          <div>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: T.dangerText, lineHeight: 1.6 }}>{gate.message}</p>
            <button
              onClick={() => void partnerUnlock()}
              style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: T.amber, color: T.onAmber, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
            >
              Try again
            </button>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: T.textDim, lineHeight: 1.6 }}>Preparing the breakdown&hellip;</p>
        )}
      </div>
    );
  }

  const disabled = sample || !token;

  return (
    <div style={{ marginTop: 14, background: T.panel, border: `1px solid ${T.panelBorder}`, borderRadius: 16, padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span aria-hidden style={{ fontSize: 15 }}>{"\u{1F512}"}</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: T.heading }}>See the line-by-line add-back breakdown</span>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: T.textDim, lineHeight: 1.6 }}>
        The full derivation behind this verdict: the owner-comp haircut, the add-back band a lender may credit,
        the lender-view SDE range, debt service, and a plain-English read of what decides this screen.
      </p>
      {disabled ? (
        <div style={{ padding: "12px 14px", borderRadius: 10, background: T.insetBg, border: `1px dashed ${T.panelBorder}`, fontSize: 13, color: T.textMute }}>
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
              style={{ ...inputStyle(T), flex: "1 1 220px" }}
              disabled={gate.kind === "sending"}
            />
            <button
              onClick={unlock}
              disabled={gate.kind === "sending"}
              style={{ padding: "11px 20px", borderRadius: 8, border: "none", background: T.amber, color: T.onAmber, fontSize: 14, fontWeight: 700, cursor: gate.kind === "sending" ? "wait" : "pointer", fontFamily: "'Inter', sans-serif" }}
            >
              {gate.kind === "sending" ? "Unlocking\u2026" : "Unlock breakdown"}
            </button>
          </div>
          {gate.kind === "gateError" && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: T.dangerText }}>{gate.message}</div>
          )}
          <p style={{ margin: "10px 0 0", fontSize: 11.5, color: T.textMute }}>
            Free. We&rsquo;ll send occasional SBA-buyer underwriting notes &mdash; no spam, unsubscribe anytime.
          </p>
        </>
      )}
    </div>
  );
}

function BreakdownCard({ breakdown }: { breakdown: SbaBreakdown }) {
  const T = useT();
  const basisMeta: Record<BreakdownLineItem["basis"], { label: string; color: string }> = {
    input: { label: "INPUT", color: T.basisInput },
    benchmark: { label: "BENCHMARK", color: T.basisBenchmark },
    derived: { label: "DERIVED", color: T.amberText },
    policy: { label: "POLICY", color: T.basisPolicy },
  };
  return (
    <div style={{ marginTop: 14, background: T.panel, border: `1px solid ${T.panelBorder}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "16px 22px", borderBottom: `1px solid ${T.panelBorder}` }}>
        <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textMute, fontWeight: 700, marginBottom: 8 }}>
          What decides this screen
        </div>
        <p style={{ margin: 0, fontSize: 14.5, color: T.heading, lineHeight: 1.65 }}>{breakdown.interpretation.killLine}</p>
      </div>

      <div style={{ padding: "10px 22px 16px" }}>
        {breakdown.lineItems.map((li, idx) => {
          const basis = basisMeta[li.basis];
          const isFinal = idx === breakdown.lineItems.length - 1;
          return (
            <div
              key={li.id}
              style={{
                display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14,
                padding: isFinal ? "12px 10px" : "10px 0",
                borderBottom: isFinal ? "none" : `1px solid ${T.rowBorder}`,
                borderTop: isFinal ? `2px solid ${T.panelBorder}` : "none",
                background: isFinal ? T.insetBg : "transparent",
                borderRadius: isFinal ? 8 : 0,
                marginTop: isFinal ? 6 : 0,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: isFinal ? 14.5 : 13.5, fontWeight: isFinal ? 700 : 400, color: isFinal ? T.heading : T.text }}>{li.label}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em", color: basis.color, border: `1px solid ${basis.color}44`, background: `${basis.color}14`, borderRadius: 5, padding: "2px 6px" }}>
                    {basis.label}
                  </span>
                </div>
                {li.note && <div style={{ fontSize: 11.5, color: T.textMute, marginTop: 3 }}>{li.note}</div>}
              </div>
              <span style={{ fontSize: isFinal ? 16 : 14, fontWeight: isFinal ? 700 : 600, color: T.heading, whiteSpace: "nowrap" as const, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}>
                {formatLineValue(li)}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ padding: "12px 22px 16px", background: T.insetBg, borderTop: `1px solid ${T.panelBorder}` }}>
        <p style={{ margin: 0, fontSize: 11.5, color: T.textMute, lineHeight: 1.55 }}>
          An underwriting screen, not a lender credit decision.
        </p>
      </div>
    </div>
  );
}

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

const CTA_COPY: Record<SbaVerdict["zone"], { lead: string; link: string }> = {
  PASS: {
    lead: "Clears the screen. The next question is whether the price is right.",
    link: "AcquiFlow runs that analysis.",
  },
  BUBBLE: {
    lead: "This screen turns on add-back documentation.",
    link: "AcquiFlow shows the full lender-view case.",
  },
  FAIL: {
    lead: "The deal can\u2019t carry this structure.",
    link: "AcquiFlow shows what price it could.",
  },
};

function ResultCta({ zone, partner, onAcquiflowClick }: { zone: SbaVerdict["zone"]; partner?: SbaPartnerConfig; onAcquiflowClick: () => void }) {
  const T = useT();
  const copy = CTA_COPY[zone];

  // Partner close: the page's ending. Collects on the member-pricing promise
  // made in the hero pill and turns the demo into a funnel.
  if (partner) {
    return (
      <a
        href="/buyer-dashboard"
        onClick={onAcquiflowClick}
        style={{ display: "block", marginTop: 14, padding: "20px 22px", borderRadius: 14, background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.25)", textDecoration: "none", textAlign: "center" as const }}
      >
        <div style={{ fontSize: 14, color: T.heading, lineHeight: 1.5, marginBottom: 12 }}>{copy.lead}</div>
        <div style={{ display: "inline-block", padding: "13px 26px", borderRadius: 10, background: T.amber, color: T.onAmber, fontSize: 15, fontWeight: 700 }}>
          Run the full AcquiFlow analysis with {partner.displayName} member pricing &rarr;
        </div>
      </a>
    );
  }

  return (
    <a
      href={ACQUIFLOW_URL}
      onClick={onAcquiflowClick}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 14, padding: "16px 20px", borderRadius: 14, background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.25)", textDecoration: "none" }}
    >
      <span style={{ fontSize: 14, color: T.heading, lineHeight: 1.5 }}>
        {copy.lead} <span style={{ color: T.amberText, fontWeight: 600 }}>{copy.link}</span>
      </span>
      <span style={{ color: T.amberText, fontSize: 18, fontWeight: 600 }}>&rarr;</span>
    </a>
  );
}

function VerdictCard({ data, sample }: { data: Extract<ApiResponse, { ok: true }>; sample?: boolean }) {
  const T = useT();
  const { verdict, meta } = data;
  const zone = ZONE_META[verdict.zone];
  const tagColor = T.mode === "light" && verdict.zone === "PASS" ? "#0F6E56" : zone.color;

  return (
    <div style={{ marginTop: 20, background: T.panel, border: `1px solid ${T.panelBorder}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.panelBorder}`, borderTop: `3px solid ${zone.color}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ padding: "5px 12px", borderRadius: 8, background: `${zone.color}1A`, border: `1px solid ${zone.color}55`, color: tagColor, fontSize: 13, fontWeight: 700, letterSpacing: "0.04em" }}>
              {zone.tag}
            </span>
            <span style={{ fontSize: 16, fontWeight: 600, color: T.heading }}>{zone.headline}</span>
            {sample && (
              <span style={{ padding: "3px 9px", borderRadius: 6, background: T.chipBg, border: `1px solid ${T.panelBorder}`, color: T.textDim, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
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
        <div style={{ padding: "8px 22px", fontSize: 12, color: T.textDim, background: T.insetBg, borderBottom: `1px solid ${T.panelBorder}` }}>
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

      <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.panelBorder}`, background: T.insetBg }}>
        <p style={{ margin: 0, fontSize: 12, color: T.textMute, lineHeight: 1.55 }}>{meta.disclaimer}</p>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: T.textDim, lineHeight: 1.55 }}>
          This is the same underwriting engine used inside AcquiFlow&rsquo;s full acquisition analysis.
        </p>
      </div>
    </div>
  );
}
