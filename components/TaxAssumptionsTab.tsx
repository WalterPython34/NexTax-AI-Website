"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";

// ═════════════════════════════════════════════════════════════════════════════
// TaxAssumptionsTab — AcquiFlow buyer-dashboard input surface
//
// PURPOSE: capture the transaction-structure assumptions that the deal record
// does not carry, so the AcquiFlow-Intel institutional report can later render
// its Structure/Tax section from them. THIS TAB IS INPUT CAPTURE ONLY — it does
// not render the report.
//
// Field names follow the LOCKED TAX-DATA-MODEL (source of truth):
//   entity_type, ppa_structure, ppa_goodwill, ppa_equipment, ppa_intangibles,
//   ppa_real_property, ppa_working_capital, asset_* , debt_seller_note,
//   state_footprint, state_tax_rate, and the OPS-only computed previews
//   ppa_shield_value / ppa_after_tax_delta / recapture_tax_dollar.
//
// SEAM (TAX-DATA-MODEL §1.2 / constitution §2.2.1) is made visible in the UI:
//   • FACT       — from the saved deal or a disclosed source (return/statement).
//   • ASSUMPTION — buyer-entered; travels labeled; never silently becomes FACT.
//   • COMPUTED   — dollar previews; OPS-only; barred from institutional reasoning.
//
// Local-state only for now. No Supabase writes, no persistence.
// ═════════════════════════════════════════════════════════════════════════════

// minimal shape of the deal records the dashboard already holds
interface DealRunLite {
  id: string;
  industry: string;
  asking_price: number;
  fair_value?: number;
  revenue?: number;
  sde?: number;
  reported_sde?: number | null;
  usable_sde?: number | null;
  city?: string | null;
  state?: string | null;
  valuation_multiple?: number;
}

type EntityType =
  | "unknown" | "c_corp" | "s_corp" | "partnership" | "disregarded_llc" | "sole_prop";
type PpaStructure =
  | "unspecified" | "asset" | "stock" | "stock_338_h_10" | "stock_336_e";
type EquipmentClass = "unspecified" | "5yr" | "7yr";
type RealPropertyClass = "unspecified" | "nonresidential_39yr" | "residential_27_5yr";
type TriState = "yes" | "no" | "unknown";

interface BasisByClass {
  goodwill: number | null;
  equipment: number | null;
  real_property: number | null;
  intangibles: number | null;
  working_capital: number | null;
}

// the full assumption record this tab produces (TAX-DATA-MODEL names)
export interface TaxAssumptionRecord {
  deal_id: string | null;
  // ── structure & entity (FACT-eligible) ──
  ppa_structure: PpaStructure;
  entity_type: EntityType;
  // ── disclosures (FACT when substantiated; tri-state captures evidence presence) ──
  nols_disclosed: TriState;
  nol_amount: number | null;
  seller_basis_disclosed: TriState;
  existing_basis_by_class: BasisByClass;
  prior_depreciation_disclosed: TriState;
  asset_accum_depreciation: number | null;   // accelerated/accumulated, if disclosed
  recapture_sensitive_present: TriState;
  // ── PPA allocations (ASSUMPTION, buyer-entered) ──
  ppa_goodwill: number | null;
  ppa_equipment: number | null;
  ppa_real_property: number | null;
  ppa_intangibles: number | null;
  ppa_working_capital: number | null;
  asset_equipment_class: EquipmentClass;       // recovery period fact (schedule)
  asset_real_property_class: RealPropertyClass;
  // ── seller note (FACT — structure; reused from acquisition inputs if present) ──
  debt_seller_note_principal: number | null;
  debt_seller_note_rate: number | null;        // stored as decimal (0.07)
  debt_seller_note_term: number | null;
  // ── planning rates (ASSUMPTION; optional; no default) ──
  buyer_ordinary_rate: number | null;
  buyer_capital_rate: number | null;
  seller_ordinary_rate: number | null;
  seller_capital_rate: number | null;
  // ── state (FACT/informational) ──
  state_footprint: string[];
}

function blankRecord(deal_id: string | null): TaxAssumptionRecord {
  return {
    deal_id,
    ppa_structure: "unspecified",
    entity_type: "unknown",
    nols_disclosed: "unknown",
    nol_amount: null,
    seller_basis_disclosed: "unknown",
    existing_basis_by_class: { goodwill: null, equipment: null, real_property: null, intangibles: null, working_capital: null },
    prior_depreciation_disclosed: "unknown",
    asset_accum_depreciation: null,
    recapture_sensitive_present: "unknown",
    ppa_goodwill: null,
    ppa_equipment: null,
    ppa_real_property: null,
    ppa_intangibles: null,
    ppa_working_capital: null,
    asset_equipment_class: "unspecified",
    asset_real_property_class: "unspecified",
    debt_seller_note_principal: null,
    debt_seller_note_rate: null,
    debt_seller_note_term: null,
    buyer_ordinary_rate: null,
    buyer_capital_rate: null,
    seller_ordinary_rate: null,
    seller_capital_rate: null,
    state_footprint: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW_ONLY — local dev fallback so the form is clickable before real data is
// wired. Used ONLY when the `deals` prop is empty. In production the passed
// `deals` prop always wins and this is never shown. Remove or ignore in prod.
// ─────────────────────────────────────────────────────────────────────────────
const PREVIEW_ONLY_DEALS: DealRunLite[] = [
  {
    id: "preview-hvac-mi",
    industry: "HVAC Services",
    asking_price: 2400000,
    fair_value: 2003038,
    revenue: 3100000,
    sde: 620000,
    usable_sde: 620000,
    city: "Detroit",
    state: "MI",
    valuation_multiple: 3.87,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PERSISTENCE BRIDGE — deal_tax_assumptions (one row per deal, upsertable)
// Mirrors the dashboard's established pattern: client-side supabase (anon key +
// user JWT), writes set user_id explicitly, RLS enforces ownership
// (auth.uid() = user_id). Same shape as toggleFavorite / deal_notes in page.tsx.
// ─────────────────────────────────────────────────────────────────────────────

// minimal structural type for the injected supabase client (avoids a hard dep)
interface SupabaseLike {
  from: (table: string) => any;
}

// COMPUTED / OPS-only fields — must NEVER be written to the canonical table.
// Defense-in-depth alongside the DB firewall guard (the table has no such columns).
const FORBIDDEN_COMPUTED_FIELDS = ["ppa_shield_value", "ppa_after_tax_delta", "recapture_tax_dollar"] as const;

// record (nested, UI shape) → row (flat, DB column shape per TAX-DATA-MODEL)
function recordToRow(rec: TaxAssumptionRecord, userId: string): Record<string, unknown> {
  const b = rec.existing_basis_by_class;
  const row: Record<string, unknown> = {
    deal_id: rec.deal_id,
    user_id: userId,
    ppa_structure: rec.ppa_structure,
    entity_type: rec.entity_type,
    seller_basis_disclosed: rec.seller_basis_disclosed,
    existing_basis_goodwill: b.goodwill,
    existing_basis_equipment: b.equipment,
    existing_basis_real_property: b.real_property,
    existing_basis_intangibles: b.intangibles,
    existing_basis_working_capital: b.working_capital,
    prior_depreciation_disclosed: rec.prior_depreciation_disclosed,
    asset_accum_depreciation: rec.asset_accum_depreciation,
    recapture_sensitive_present: rec.recapture_sensitive_present,
    nols_disclosed: rec.nols_disclosed,
    nol_amount: rec.nol_amount,
    ppa_goodwill: rec.ppa_goodwill,
    ppa_equipment: rec.ppa_equipment,
    ppa_real_property: rec.ppa_real_property,
    ppa_intangibles: rec.ppa_intangibles,
    ppa_working_capital: rec.ppa_working_capital,
    asset_equipment_class: rec.asset_equipment_class,
    asset_real_property_class: rec.asset_real_property_class,
    debt_seller_note_principal: rec.debt_seller_note_principal,
    debt_seller_note_rate: rec.debt_seller_note_rate,
    debt_seller_note_term: rec.debt_seller_note_term,
    buyer_ordinary_rate: rec.buyer_ordinary_rate,
    buyer_capital_rate: rec.buyer_capital_rate,
    seller_ordinary_rate: rec.seller_ordinary_rate,
    seller_capital_rate: rec.seller_capital_rate,
    state_footprint: rec.state_footprint,
    source_type: "entered",
    evidence_quality: "assumed",
  };
  // hard strip: never let a computed/OPS-only field reach the write
  for (const f of FORBIDDEN_COMPUTED_FIELDS) delete (row as Record<string, unknown>)[f];
  return row;
}

// row (flat, from DB) → record (nested, UI shape)
function rowToRecord(row: Record<string, any>): TaxAssumptionRecord {
  return {
    deal_id: row.deal_id ?? null,
    ppa_structure: row.ppa_structure ?? "unspecified",
    entity_type: row.entity_type ?? "unknown",
    nols_disclosed: row.nols_disclosed ?? "unknown",
    nol_amount: row.nol_amount ?? null,
    seller_basis_disclosed: row.seller_basis_disclosed ?? "unknown",
    existing_basis_by_class: {
      goodwill: row.existing_basis_goodwill ?? null,
      equipment: row.existing_basis_equipment ?? null,
      real_property: row.existing_basis_real_property ?? null,
      intangibles: row.existing_basis_intangibles ?? null,
      working_capital: row.existing_basis_working_capital ?? null,
    },
    prior_depreciation_disclosed: row.prior_depreciation_disclosed ?? "unknown",
    asset_accum_depreciation: row.asset_accum_depreciation ?? null,
    recapture_sensitive_present: row.recapture_sensitive_present ?? "unknown",
    ppa_goodwill: row.ppa_goodwill ?? null,
    ppa_equipment: row.ppa_equipment ?? null,
    ppa_real_property: row.ppa_real_property ?? null,
    ppa_intangibles: row.ppa_intangibles ?? null,
    ppa_working_capital: row.ppa_working_capital ?? null,
    asset_equipment_class: row.asset_equipment_class ?? "unspecified",
    asset_real_property_class: row.asset_real_property_class ?? "unspecified",
    debt_seller_note_principal: row.debt_seller_note_principal ?? null,
    debt_seller_note_rate: row.debt_seller_note_rate ?? null,
    debt_seller_note_term: row.debt_seller_note_term ?? null,
    buyer_ordinary_rate: row.buyer_ordinary_rate ?? null,
    buyer_capital_rate: row.buyer_capital_rate ?? null,
    seller_ordinary_rate: row.seller_ordinary_rate ?? null,
    seller_capital_rate: row.seller_capital_rate ?? null,
    state_footprint: Array.isArray(row.state_footprint) ? row.state_footprint : [],
  };
}

// ── design tokens (match buyer-dashboard) ──
const INK = "#E2E8F0", MUTE = "#7C8593", MUTE2 = "#94A3B8", FAINT = "#6B7280";
const PANEL_BG = "rgba(255,255,255,0.02)", PANEL_BORDER = "1px solid rgba(255,255,255,0.06)";
const INPUT_BG = "rgba(255,255,255,0.03)", INPUT_BORDER = "1px solid rgba(255,255,255,0.08)";
const INDIGO = "#6366F1", VIOLET = "#C4B5FD", VIOLET_DIM = "#A5B4FC";
const GREEN = "#10B981", AMBER = "#F59E0B";
const FONT = "'Inter',sans-serif";

// seam badge colors
const SEAM = {
  FACT:       { label: "imported from deal",  color: "#34D399", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)" },
  ASSUMPTION: { label: "buyer input", color: "#FCD34D", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)" },
  COMPUTED:   { label: "analysis only", color: "#A5B4FC", bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.3)" },
};

function SeamBadge({ kind }: { kind: keyof typeof SEAM }) {
  const s = SEAM[kind];
  return (
    <span style={{
      fontSize: 8.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
      padding: "2px 6px", borderRadius: 20, color: s.color, background: s.bg,
      border: `1px solid ${s.border}`, whiteSpace: "nowrap",
    }}>{s.label}</span>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 11px", borderRadius: 8, border: INPUT_BORDER,
  background: INPUT_BG, color: INK, fontSize: 13, fontFamily: FONT,
  outline: "none", boxSizing: "border-box",
};
const selStyle: React.CSSProperties = {
  width: "100%", padding: "8px 11px", borderRadius: 8, border: INPUT_BORDER,
  background: INPUT_BG, color: INK, fontSize: 13, fontFamily: FONT,
  outline: "none", appearance: "none" as any, cursor: "pointer",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 9.5, fontWeight: 600, color: MUTE,
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4,
};

// ── small field helpers ──
function MoneyField({ label, value, onChange, seam, placeholder }: {
  label: string; value: number | null; onChange: (v: number | null) => void;
  seam?: keyof typeof SEAM; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={labelStyle}>{label}</span>
        {seam && <SeamBadge kind={seam} />}
      </div>
      <input
        value={value ?? ""}
        placeholder={placeholder ?? "—"}
        onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ""); onChange(v === "" ? null : Number(v)); }}
        style={inputStyle}
      />
    </div>
  );
}

function RateField({ label, value, onChange }: {
  label: string; value: number | null; onChange: (v: number | null) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={labelStyle}>{label}</span>
        <SeamBadge kind="ASSUMPTION" />
      </div>
      <div style={{ position: "relative" }}>
        <input
          value={value != null ? +(value * 100).toFixed(4) : ""}
          placeholder="optional — no default"
          onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ""); onChange(v === "" ? null : Number(v) / 100); }}
          style={{ ...inputStyle, paddingRight: 26 }}
        />
        <span style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", color: FAINT, fontSize: 12 }}>%</span>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, seam }: {
  label: string; value: string; onChange: (v: string) => void;
  options: [string, string][]; seam?: keyof typeof SEAM;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={labelStyle}>{label}</span>
        {seam && <SeamBadge kind={seam} />}
      </div>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={selStyle}>
        {options.map(([v, l]) => <option key={v} value={v} style={{ background: "#0D1117" }}>{l}</option>)}
      </select>
    </div>
  );
}

function TriField({ label, value, onChange }: {
  label: string; value: TriState; onChange: (v: TriState) => void;
}) {
  const opts: TriState[] = ["yes", "no", "unknown"];
  return (
    <div style={{ marginBottom: 12 }}>
      <span style={{ ...labelStyle, marginBottom: 5 }}>{label}</span>
      <div style={{ display: "flex", gap: 5 }}>
        {opts.map((o) => {
          const on = value === o;
          return (
            <button key={o} onClick={() => onChange(o)} style={{
              flex: 1, padding: "6px 0", borderRadius: 7, fontSize: 11.5, fontFamily: FONT,
              cursor: "pointer", textTransform: "capitalize",
              border: `1px solid ${on ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)"}`,
              background: on ? "rgba(99,102,241,0.18)" : INPUT_BG,
              color: on ? VIOLET : MUTE2, fontWeight: on ? 600 : 400,
            }}>{o}</button>
          );
        })}
      </div>
    </div>
  );
}

function Panel({ title, subtitle, seamHint, children }: {
  title: string; subtitle?: string; seamHint?: keyof typeof SEAM; children: React.ReactNode;
}) {
  return (
    <div style={{ background: PANEL_BG, border: PANEL_BORDER, borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "13px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: INK, textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: MUTE, marginTop: 3 }}>{subtitle}</div>}
        </div>
        {seamHint && <SeamBadge kind={seamHint} />}
      </div>
      <div style={{ padding: "16px" }}>{children}</div>
    </div>
  );
}

// ── Acquisition Structure Snapshot — at-a-glance status mirror that becomes the
//    executive summary feeding AcquiFlow-Intel. Reports INPUT COMPLETENESS, not
//    deal quality: readiness is "how many structural reads have their inputs,"
//    never a score and never a judgment that one structure is preferable.
function StructureSnapshot({ rec, ready, total }: {
  rec: TaxAssumptionRecord; ready: number; total: number;
}) {
  const structLabel: Record<PpaStructure, string> = {
    unspecified: "Not specified", asset: "Asset purchase", stock: "Stock purchase",
    stock_338_h_10: "Stock + §338(h)(10)", stock_336_e: "Stock + §336(e)",
  };
  const entityLabelMap: Record<EntityType, string> = {
    unknown: "Not specified", c_corp: "C-Corporation", s_corp: "S-Corporation",
    partnership: "LLC (partnership)", disregarded_llc: "Disregarded LLC", sole_prop: "Sole proprietorship",
  };
  const ppaCount = [rec.ppa_goodwill, rec.ppa_equipment, rec.ppa_real_property, rec.ppa_intangibles, rec.ppa_working_capital]
    .filter((v) => typeof v === "number" && v > 0).length;
  const ppaEntered = ppaCount === 0 ? "No" : ppaCount >= 3 ? "Yes" : "Partial";
  const tri = (t: TriState) => (t === "yes" ? "Yes" : t === "no" ? "No" : "Unknown");

  const rows: [string, string, boolean][] = [
    // [label, value, isSpecified]
    ["Transaction structure", structLabel[rec.ppa_structure], rec.ppa_structure !== "unspecified"],
    ["Entity type", entityLabelMap[rec.entity_type], rec.entity_type !== "unknown"],
    ["PPA entered", ppaEntered, ppaCount > 0],
    ["NOL disclosure", tri(rec.nols_disclosed), rec.nols_disclosed !== "unknown"],
    ["Basis disclosure", tri(rec.seller_basis_disclosed), rec.seller_basis_disclosed !== "unknown"],
  ];

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: INK, textTransform: "uppercase", letterSpacing: "0.08em" }}>Acquisition structure snapshot</span>
        <span style={{ fontSize: 10, color: MUTE, fontStyle: "italic" }}>input status — not a deal score</span>
      </div>
      <div style={{ padding: "14px 16px", display: "flex", flexWrap: "wrap", gap: "10px 28px", alignItems: "center" }}>
        {rows.map(([label, value, set]) => (
          <div key={label} style={{ minWidth: 150 }}>
            <div style={{ fontSize: 9, color: FAINT, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
            <div style={{ fontSize: 13.5, color: set ? INK : MUTE, marginTop: 3, fontWeight: set ? 600 : 400 }}>
              {!set && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.18)", marginRight: 6, verticalAlign: "middle" }} />}
              {value}
            </div>
          </div>
        ))}
        {/* readiness pill */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: FAINT, textTransform: "uppercase", letterSpacing: "0.06em" }}>Structure readiness</div>
            <div style={{ fontSize: 18, color: VIOLET, fontWeight: 700, fontFamily: "ui-monospace, monospace", marginTop: 1 }}>{ready} / {total}</div>
          </div>
          <div style={{ width: 56, height: 56, position: "relative", flexShrink: 0 }}>
            <svg width="56" height="56" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
              <circle cx="28" cy="28" r="24" fill="none" stroke="#6366F1" strokeWidth="5" strokeLinecap="round"
                strokeDasharray={`${(total ? ready / total : 0) * 2 * Math.PI * 24} ${2 * Math.PI * 24}`}
                transform="rotate(-90 28 28)" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function TaxAssumptionsTab({
  deals = [],
  isPro = true,
  userId = null,
  supabase = null,
  pendingDealId = null,
  onPendingDealIdConsumed,
  onShowUpgrade,
}: {
  deals?: DealRunLite[];
  isPro?: boolean;
  userId?: string | null;
  supabase?: SupabaseLike | null;
  pendingDealId?: string | null;
  onPendingDealIdConsumed?: () => void;
  onShowUpgrade?: () => void;
}) {
  // PREVIEW_ONLY: if no real deals are passed (local dev), fall back to a single
  // mock deal so the form is clickable. Production always uses the `deals` prop.
  const usingPreview = deals.length === 0;
  const effectiveDeals: DealRunLite[] = usingPreview ? PREVIEW_ONLY_DEALS : deals;

  // persistence is active only with a real supabase client + userId + real deals.
  // In preview (no deals) we stay local-state-only exactly as before.
  const persistenceEnabled = !!supabase && !!userId && !usingPreview;

  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  // assumption records keyed by deal id (local cache; durable via supabase when enabled)
  const [records, setRecords] = useState<Record<string, TaxAssumptionRecord>>({});

  // per-deal load/save status for visible success/error states
  type SaveState = "idle" | "loading" | "loaded" | "saving" | "saved" | "error";
  const [status, setStatus] = useState<SaveState>("idle");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [dirty, setDirty] = useState<boolean>(false);
  const [loadedDealIds, setLoadedDealIds] = useState<Set<string>>(new Set());

  const selectedDeal = useMemo(
    () => effectiveDeals.find((d) => d.id === selectedDealId) ?? null,
    [effectiveDeals, selectedDealId],
  );

  // consume a pending deal id handed off from another tab (e.g. "Open Tax Assumptions")
  useEffect(() => {
    if (pendingDealId) {
      setSelectedDealId(pendingDealId);
      onPendingDealIdConsumed?.();
    }
  }, [pendingDealId, onPendingDealIdConsumed]);

  // on deal select: load from deal_tax_assumptions (if enabled), else seed blank.
  useEffect(() => {
    if (!selectedDealId) return;
    let cancelled = false;

    // already have it cached this session → don't reload (preserves unsaved edits)
    if (records[selectedDealId]) { setStatus("loaded"); setStatusMsg(""); return; }

    const seedBlank = () => {
      const seed = blankRecord(selectedDealId);
      const d = effectiveDeals.find((x) => x.id === selectedDealId);
      if (d?.state) seed.state_footprint = [d.state];
      return seed;
    };

    if (!persistenceEnabled || !supabase) {
      // local-state-only path (preview / no client): seed blank, exactly as before
      setRecords((prev) => (prev[selectedDealId] ? prev : { ...prev, [selectedDealId]: seedBlank() }));
      return;
    }

    // durable path: SELECT the row; hydrate if present, else seed blank.
    setStatus("loading"); setStatusMsg("Loading saved assumptions…");
    (async () => {
      try {
        const { data, error } = await supabase
          .from("deal_tax_assumptions")
          .select("*")
          .eq("deal_id", selectedDealId)
          .maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        const rec = data ? rowToRecord(data) : seedBlank();
        setRecords((prev) => ({ ...prev, [selectedDealId]: rec }));
        setLoadedDealIds((prev) => new Set(prev).add(selectedDealId));
        setDirty(false);
        setStatus("loaded");
        setStatusMsg(data ? "Loaded saved assumptions." : "No saved assumptions yet — start entering.");
      } catch (e: any) {
        if (cancelled) return;
        // graceful fallback: still let the user work locally even if load failed
        setRecords((prev) => (prev[selectedDealId!] ? prev : { ...prev, [selectedDealId!]: seedBlank() }));
        setStatus("error");
        setStatusMsg("Couldn’t load saved assumptions — you can still enter them; saving will retry.");
      }
    })();

    return () => { cancelled = true; };
  }, [selectedDealId, persistenceEnabled, supabase, effectiveDeals]);

  const rec = selectedDealId ? records[selectedDealId] ?? blankRecord(selectedDealId) : null;
  const patch = useCallback((p: Partial<TaxAssumptionRecord>) => {
    if (!selectedDealId) return;
    setRecords((prev) => ({ ...prev, [selectedDealId]: { ...(prev[selectedDealId] ?? blankRecord(selectedDealId)), ...p } }));
    setDirty(true);
    setStatus((st) => (st === "saved" || st === "loaded" ? "idle" : st));
  }, [selectedDealId]);
  const patchBasis = useCallback((cls: keyof BasisByClass, v: number | null) => {
    if (!selectedDealId || !rec) return;
    patch({ existing_basis_by_class: { ...rec.existing_basis_by_class, [cls]: v } });
  }, [selectedDealId, rec, patch]);

  // ── SAVE: upsert the current record into deal_tax_assumptions ──
  const handleSave = useCallback(async () => {
    if (!selectedDealId || !rec) return;
    if (!persistenceEnabled || !supabase || !userId) {
      // preview / no client: keep prior local-only behavior, but tell the user plainly
      setStatus("saved");
      setStatusMsg("Saved in this session (preview mode — not yet persisted to the database).");
      setDirty(false);
      return;
    }
    setStatus("saving"); setStatusMsg("Saving…");
    try {
      const row = recordToRow(rec, userId); // recordToRow strips COMPUTED/OPS-only fields
      const { error } = await supabase
        .from("deal_tax_assumptions")
        .upsert(row, { onConflict: "deal_id" });
      if (error) throw error;
      setLoadedDealIds((prev) => new Set(prev).add(selectedDealId));
      setDirty(false);
      setStatus("saved");
      setStatusMsg("Saved.");
    } catch (e: any) {
      setStatus("error");
      setStatusMsg("Save failed: " + (e?.message ?? "unknown error") + ". Your entries are kept locally — try again.");
    }
  }, [selectedDealId, rec, persistenceEnabled, supabase, userId]);

  // ── PPA running total (OPS preview only) ──
  const ppaTotal: number = rec
    ? [rec.ppa_goodwill, rec.ppa_equipment, rec.ppa_real_property, rec.ppa_intangibles, rec.ppa_working_capital]
        .reduce((a: number, v) => a + (typeof v === "number" ? v : 0), 0)
    : 0;

  // ── readiness: which institutional reads this record can support (FACT-side) ──
  const readiness = useMemo(() => {
    if (!rec) return { ready: 0, total: 0, notes: [] as string[] };
    const notes: string[] = [];
    let ready = 0; const total = 6;
    if (rec.ppa_structure !== "unspecified") ready++; else notes.push("transaction structure");
    if (rec.entity_type !== "unknown") ready++; else notes.push("target entity type");
    if (rec.ppa_goodwill || rec.ppa_equipment || rec.ppa_intangibles || rec.ppa_real_property) ready++; else notes.push("a purchase-price allocation");
    if (rec.seller_basis_disclosed !== "unknown") ready++; else notes.push("seller-basis disclosure");
    if (rec.nols_disclosed !== "unknown") ready++; else notes.push("NOL disclosure");
    if (rec.recapture_sensitive_present !== "unknown" || rec.prior_depreciation_disclosed !== "unknown") ready++; else notes.push("depreciation / recapture facts");
    return { ready, total, notes };
  }, [rec]);

  const moneyFmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

  const ENTITY_OPTS: [string, string][] = [
    ["unknown", "Unknown"], ["c_corp", "C-Corporation"], ["s_corp", "S-Corporation"],
    ["partnership", "LLC (taxed as partnership)"], ["disregarded_llc", "Single-member / disregarded LLC"], ["sole_prop", "Sole proprietorship"],
  ];
  const STRUCT_OPTS: [string, string][] = [
    ["unspecified", "Unspecified"], ["asset", "Asset purchase"], ["stock", "Stock purchase"],
    ["stock_338_h_10", "Stock purchase + §338(h)(10)"], ["stock_336_e", "Stock purchase + §336(e)"],
  ];
  const EQ_CLASS_OPTS: [string, string][] = [["unspecified", "Unspecified"], ["5yr", "5-year"], ["7yr", "7-year"]];
  const RP_CLASS_OPTS: [string, string][] = [["unspecified", "Unspecified"], ["nonresidential_39yr", "Nonresidential (39-yr)"], ["residential_27_5yr", "Residential (27.5-yr)"]];

  return (
    // Root carries the dark app background so the tab renders correctly when
    // previewed standalone. Inside the buyer-dashboard shell this sits on the
    // same #080C13 content area, so the matching background is invisible/harmless.
    <div style={{ fontFamily: FONT, color: INK, background: "#080C13", minHeight: "100%", padding: "4px 2px" }}>
      {/* PREVIEW_ONLY banner — shown only when falling back to the mock deal */}
      {usingPreview && (
        <div style={{
          marginBottom: 14, padding: "9px 14px", borderRadius: 10,
          background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)",
          fontSize: 11.5, color: "#FCD34D", display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 13 }}>⚠</span>
          <span><b>Preview mode</b> — no saved deals passed, showing one mock deal for local dev only. In production this uses your real deals.</span>
        </div>
      )}
      {/* ── intro ── */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: MUTE, textTransform: "uppercase", letterSpacing: "0.1em" }}>TAX ASSUMPTIONS</div>
        <div style={{ fontSize: 13, color: MUTE2, marginTop: 6, lineHeight: 1.55, maxWidth: 780 }}>
          Capture the transaction-structure assumptions a deal record doesn’t carry. These feed the AcquiFlow-Intel report’s Structure section. Every field is optional — blanks become honest “not yet specified” reads, never errors. Nothing here computes tax liability, savings, or a recommended structure.
        </div>
      </div>

      {/* ── seam legend ── */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 16, padding: "10px 14px", background: PANEL_BG, border: PANEL_BORDER, borderRadius: 10 }}>
        <span style={{ fontSize: 10.5, color: MUTE, fontWeight: 600 }}>How values are classified:</span>
        <span style={{ display: "flex", gap: 7, alignItems: "center" }}><SeamBadge kind="FACT" /><span style={{ fontSize: 11, color: MUTE2 }}>pulled from the saved deal or a disclosed source</span></span>
        <span style={{ display: "flex", gap: 7, alignItems: "center" }}><SeamBadge kind="ASSUMPTION" /><span style={{ fontSize: 11, color: MUTE2 }}>entered by you; travels labeled</span></span>
        <span style={{ display: "flex", gap: 7, alignItems: "center" }}><SeamBadge kind="COMPUTED" /><span style={{ fontSize: 11, color: MUTE2 }}>preview math; never enters the report as a fact</span></span>
      </div>

      {/* ── deal selector ── */}
      <div style={{ background: PANEL_BG, border: PANEL_BORDER, borderRadius: 14, padding: "16px", marginBottom: 16 }}>
        <span style={labelStyle}>Saved deal</span>
        <select
          value={selectedDealId ?? ""}
          onChange={(e) => setSelectedDealId(e.target.value || null)}
          style={{ ...selStyle, maxWidth: 460 }}
        >
          <option value="" style={{ background: "#0D1117" }}>— Select a deal —</option>
          {effectiveDeals.map((d) => (
            <option key={d.id} value={d.id} style={{ background: "#0D1117" }}>
              {d.industry}{d.city || d.state ? ` · ${[d.city, d.state].filter(Boolean).join(", ")}` : ""} — {moneyFmt(d.asking_price)}
            </option>
          ))}
        </select>

        {selectedDeal && (
          <div style={{ marginTop: 14, display: "flex", gap: 22, flexWrap: "wrap", paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            {([
              ["Industry", selectedDeal.industry],
              ["Asking price", moneyFmt(selectedDeal.asking_price)],
              ["SDE", (() => { const sde = selectedDeal.usable_sde ?? selectedDeal.sde ?? selectedDeal.reported_sde; return typeof sde === "number" ? moneyFmt(sde) : "—"; })()],
              ["State", selectedDeal.state ?? "—"],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 9, color: FAINT, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</span>
                  <SeamBadge kind="FACT" />
                </div>
                <div style={{ fontSize: 14, color: INK, marginTop: 3 }}>{v}</div>
              </div>
            ))}
            <div style={{ fontSize: 11, color: MUTE, alignSelf: "center", fontStyle: "italic" }}>auto-filled from the saved deal — shared context for every assumption below</div>
          </div>
        )}
      </div>

      {!selectedDeal || !rec ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: FAINT, fontSize: 13, background: PANEL_BG, border: PANEL_BORDER, borderRadius: 14 }}>
          Select a saved deal to enter its tax assumptions.
        </div>
      ) : (
        <>
          {/* ── acquisition structure snapshot (executive status mirror) ── */}
          <StructureSnapshot rec={rec} ready={readiness.ready} total={readiness.total} />

          {/* ── readiness readout (narrative) ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: "13px 16px", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: INK }}>
                The report’s Structure section can ground <b style={{ color: VIOLET }}>{readiness.ready}</b> of {readiness.total} structural reads from the current inputs.
              </div>
              <div style={{ fontSize: 11, color: MUTE, marginTop: 3 }}>
                {readiness.notes.length
                  ? `Still open: ${readiness.notes.join(", ")} — these stay “not yet specified,” not errors.`
                  : "All structural reads have the inputs they need."}
              </div>
            </div>
          </div>

          {/* two-column layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>

            {/* ── LEFT: deal / canonical context ── */}
            <div>
              <Panel title="Structure & entity" subtitle="The core election and the target’s form" seamHint="FACT">
                <SelectField label="Acquisition structure" value={rec.ppa_structure} onChange={(v) => patch({ ppa_structure: v as PpaStructure })} options={STRUCT_OPTS} seam="FACT" />
                <SelectField label="Target entity type" value={rec.entity_type} onChange={(v) => patch({ entity_type: v as EntityType })} options={ENTITY_OPTS} seam="FACT" />
              </Panel>

              <Panel title="Seller basis & depreciation disclosures" subtitle="What the seller has disclosed">
                <TriField label="Seller basis disclosed?" value={rec.seller_basis_disclosed} onChange={(v) => patch({ seller_basis_disclosed: v })} />
                {rec.seller_basis_disclosed === "yes" && (
                  <div style={{ paddingLeft: 12, borderLeft: "2px solid rgba(255,255,255,0.08)", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 9.5, color: MUTE, textTransform: "uppercase", letterSpacing: "0.06em" }}>Existing tax basis by class</span>
                      <SeamBadge kind="FACT" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <MoneyField label="Goodwill basis" value={rec.existing_basis_by_class.goodwill} onChange={(v) => patchBasis("goodwill", v)} />
                      <MoneyField label="Equipment basis" value={rec.existing_basis_by_class.equipment} onChange={(v) => patchBasis("equipment", v)} />
                      <MoneyField label="Real property basis" value={rec.existing_basis_by_class.real_property} onChange={(v) => patchBasis("real_property", v)} />
                      <MoneyField label="Intangibles basis" value={rec.existing_basis_by_class.intangibles} onChange={(v) => patchBasis("intangibles", v)} />
                    </div>
                  </div>
                )}
                <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "6px 0 12px" }} />
                <TriField label="Prior depreciation disclosed?" value={rec.prior_depreciation_disclosed} onChange={(v) => patch({ prior_depreciation_disclosed: v })} />
                {rec.prior_depreciation_disclosed === "yes" && (
                  <MoneyField label="Accumulated / accelerated depreciation" value={rec.asset_accum_depreciation} onChange={(v) => patch({ asset_accum_depreciation: v })} seam="FACT" />
                )}
                <TriField label="Recapture-sensitive classes present?" value={rec.recapture_sensitive_present} onChange={(v) => patch({ recapture_sensitive_present: v })} />
              </Panel>

              <Panel title="NOLs" subtitle="Disclosed net operating losses">
                <TriField label="NOLs disclosed?" value={rec.nols_disclosed} onChange={(v) => patch({ nols_disclosed: v })} />
                {rec.nols_disclosed === "yes" && (
                  <MoneyField label="Disclosed NOL amount (optional)" value={rec.nol_amount} onChange={(v) => patch({ nol_amount: v })} seam="FACT" />
                )}
              </Panel>

              <Panel title="Seller note" subtitle="Tax-relevant terms (reused from acquisition inputs if present)" seamHint="FACT">
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 10 }}>
                  <MoneyField label="Principal" value={rec.debt_seller_note_principal} onChange={(v) => patch({ debt_seller_note_principal: v })} />
                  <RateField label="Rate" value={rec.debt_seller_note_rate} onChange={(v) => patch({ debt_seller_note_rate: v })} />
                  <MoneyField label="Term (yrs)" value={rec.debt_seller_note_term} onChange={(v) => patch({ debt_seller_note_term: v })} />
                </div>
              </Panel>

              <Panel title="State footprint" subtitle="Informational only — no state tax estimate or apportionment" seamHint="FACT">
                <span style={labelStyle}>States of operation</span>
                <input
                  value={rec.state_footprint.join(", ")}
                  placeholder="e.g. MI, OH"
                  onChange={(e) => patch({ state_footprint: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  style={inputStyle}
                />
              </Panel>
            </div>

            {/* ── RIGHT: buyer-entered assumptions ── */}
            <div>
              <Panel title="Purchase-price allocation" subtitle="Buyer-entered allocation by class" seamHint="ASSUMPTION">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <MoneyField label="Goodwill" value={rec.ppa_goodwill} onChange={(v) => patch({ ppa_goodwill: v })} />
                  <MoneyField label="Equipment / FF&E" value={rec.ppa_equipment} onChange={(v) => patch({ ppa_equipment: v })} />
                </div>
                <SelectField label="Equipment recovery class" value={rec.asset_equipment_class} onChange={(v) => patch({ asset_equipment_class: v as EquipmentClass })} options={EQ_CLASS_OPTS} seam="FACT" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <MoneyField label="Real property" value={rec.ppa_real_property} onChange={(v) => patch({ ppa_real_property: v })} />
                  <MoneyField label="Other intangibles" value={rec.ppa_intangibles} onChange={(v) => patch({ ppa_intangibles: v })} />
                </div>
                <SelectField label="Real property class" value={rec.asset_real_property_class} onChange={(v) => patch({ asset_real_property_class: v as RealPropertyClass })} options={RP_CLASS_OPTS} seam="FACT" />
                <MoneyField label="Inventory / working capital" value={rec.ppa_working_capital} onChange={(v) => patch({ ppa_working_capital: v })} />

                {/* OPS-only allocation total preview */}
                <div style={{ marginTop: 6, padding: "10px 12px", borderRadius: 8, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: MUTE, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total allocated</span>
                    <SeamBadge kind="COMPUTED" />
                  </div>
                  <span style={{ fontSize: 14, color: INK, fontFamily: "ui-monospace, monospace" }}>
                    {moneyFmt(ppaTotal)}
                    {selectedDeal && <span style={{ color: MUTE, fontSize: 12 }}>{` / asking ${moneyFmt(selectedDeal.asking_price)}`}</span>}
                  </span>
                </div>
                <div style={{ fontSize: 10.5, color: FAINT, marginTop: 6, fontStyle: "italic" }}>Shown for your reference. The allocation need not tie to the purchase price — no warning, no correction.</div>
              </Panel>

              <Panel title="Planning tax rates" subtitle="Optional · user-entered · no defaults" seamHint="ASSUMPTION">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <RateField label="Buyer ordinary" value={rec.buyer_ordinary_rate} onChange={(v) => patch({ buyer_ordinary_rate: v })} />
                  <RateField label="Buyer capital" value={rec.buyer_capital_rate} onChange={(v) => patch({ buyer_capital_rate: v })} />
                  <RateField label="Seller ordinary" value={rec.seller_ordinary_rate} onChange={(v) => patch({ seller_ordinary_rate: v })} />
                  <RateField label="Seller capital" value={rec.seller_capital_rate} onChange={(v) => patch({ seller_capital_rate: v })} />
                </div>
                <div style={{ fontSize: 10.5, color: FAINT, marginTop: 4, fontStyle: "italic" }}>
                  Left blank, rate-dependent figures stay “not computable.” Entered rates produce preview-only (OPS) dollar figures in the report’s operational layer — never institutional facts.
                </div>
              </Panel>

              {/* save + live status */}
              <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "flex-end", marginTop: 4 }}>
                {(() => {
                  const tone =
                    status === "error" ? { c: "#FCA5A5", dot: "#EF4444" }
                    : status === "saved" ? { c: "#6EE7B7", dot: GREEN }
                    : status === "saving" || status === "loading" ? { c: VIOLET_DIM, dot: INDIGO }
                    : dirty ? { c: "#FCD34D", dot: AMBER }
                    : { c: FAINT, dot: "transparent" };
                  const text =
                    statusMsg ? statusMsg
                    : dirty ? "Unsaved changes."
                    : persistenceEnabled ? "Saved to your account." : "Held in this session only.";
                  return (
                    <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: tone.c, fontStyle: "italic" }}>
                      {tone.dot !== "transparent" && <span style={{ width: 7, height: 7, borderRadius: 4, background: tone.dot, display: "inline-block" }} />}
                      {text}
                    </span>
                  );
                })()}
                <button
                  onClick={handleSave}
                  disabled={status === "saving" || status === "loading"}
                  style={{
                    padding: "9px 18px", borderRadius: 8, border: "none",
                    background: (status === "saving" || status === "loading")
                      ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#3B82F6,#6366F1)",
                    color: "#fff", fontSize: 12.5, fontWeight: 600, fontFamily: FONT,
                    cursor: (status === "saving" || status === "loading") ? "default" : "pointer",
                  }}
                >
                  {status === "saving" ? "Saving…" : "Save assumptions"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
