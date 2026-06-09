"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  buildTaxSnapshot,
  buildTaxFactsView,
  buildTaxImplicationsView,
  buildTaxComparisonRows,
  buildStructureSections,
  buildBasisDeltaView,
  type TaxSnapshot,
  type TaxFactsView,
  type TaxImplicationsView,
  type BasisDeltaView,
  type BasisRecoveryLabel,
  type RecaptureExposureLabel,
  type NolPositionLabel,
  type EvaluatedLabel,
} from "@/lib/acquiflow/tax-snapshot-derivations";
import {
  buildStructuralComparisonPanel,
  type StructuralComparisonPanelPlan,
} from "@/lib/acquiflow/structural-comparison";
import { buildTaxStructureSection } from "@/lib/acquiflow/tax-structure-section";
import type { DealTaxAssumptionsRow } from "@/lib/intelligence/tax/tax-row-to-engine-input";

// ── Tax Fact Drilldown (shared seam badge + drawer + adapter) ──
import { SeamBadge, SEAM } from "@/components/tax/SeamBadge";
import { TaxDrilldownDrawer } from "@/components/tax/TaxDrilldownDrawer";
import {
  buildSnapshotDrilldown,
  buildTaxFactDrilldown,
  buildImplicationStatementDrilldown,
  buildImplicationScheduleDrilldown,
  buildCalcDiffDrilldown,
  buildComparisonDrilldown,
  type DrilldownViewModel,
  type SnapshotRowId,
  type CalcDiffValueId,
} from "@/lib/acquiflow/tax-drilldown-adapter";

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

// NOTE: SEAM + SeamBadge moved to components/tax/SeamBadge.tsx (shared with the
// drilldown drawer; importing it back from this file would be circular). DERIVED
// was added there. `keyof typeof SEAM` references below resolve to the import.

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
// LIVE-PREVIEW VIEW MODELS — translate component-local enum values into the
// engine-canonical names the helpers/builder expect. This is the boundary the
// view-model layer requires (Invariant 1: React consumes helper output only).
// ─────────────────────────────────────────────────────────────────────────────

type EnginePpaStructure = "unspecified" | "asset" | "stock" | "stock_with_338_h_10" | "stock_with_336_e";
type EngineEntityType =
  | "unknown" | "c_corp" | "s_corp" | "llc_partnership" | "llc_disregarded" | "sole_prop";

interface EngineRec extends Omit<TaxAssumptionRecord, "ppa_structure" | "entity_type"> {
  ppa_structure: EnginePpaStructure;
  entity_type: EngineEntityType;
}

/**
 * Translate the component-local record (DB-enum values) into the engine-naming
 * record the helpers and the builder consume. Concentrated in one place so
 * the helpers stay clean and the live component can keep its DB-enum types.
 */
function recToEngineRec(rec: TaxAssumptionRecord): EngineRec {
  const structureMap: Record<PpaStructure, EnginePpaStructure> = {
    unspecified: "unspecified", asset: "asset", stock: "stock",
    stock_338_h_10: "stock_with_338_h_10", stock_336_e: "stock_with_336_e",
  };
  const entityMap: Record<EntityType, EngineEntityType> = {
    unknown: "unknown", c_corp: "c_corp", s_corp: "s_corp",
    partnership: "llc_partnership", disregarded_llc: "llc_disregarded", sole_prop: "sole_prop",
  };
  return { ...rec, ppa_structure: structureMap[rec.ppa_structure], entity_type: entityMap[rec.entity_type] };
}

/**
 * Translate a record into the DealTaxAssumptionsRow shape the builder consumes.
 * Mirrors recordToRow but uses engine-enum values, and applies the mechanical
 * recapture derivation from Decision #1.
 */
function recToBuilderRow(rec: TaxAssumptionRecord): DealTaxAssumptionsRow {
  const er = recToEngineRec(rec);
  const eqRecaptureSensitive = (rec.ppa_equipment ?? 0) > 0 || (rec.ppa_real_property ?? 0) > 0;
  return {
    deal_id: rec.deal_id ?? "preview",
    ppa_structure: er.ppa_structure as DealTaxAssumptionsRow["ppa_structure"],
    entity_type: er.entity_type as DealTaxAssumptionsRow["entity_type"],
    seller_basis_disclosed: rec.seller_basis_disclosed,
    existing_basis_goodwill: rec.existing_basis_by_class.goodwill,
    existing_basis_equipment: rec.existing_basis_by_class.equipment,
    existing_basis_real_property: rec.existing_basis_by_class.real_property,
    existing_basis_intangibles: rec.existing_basis_by_class.intangibles,
    existing_basis_working_capital: rec.existing_basis_by_class.working_capital,
    prior_depreciation_disclosed: rec.prior_depreciation_disclosed,
    asset_accum_depreciation: rec.asset_accum_depreciation,
    recapture_sensitive_present: eqRecaptureSensitive ? "yes" : "no",
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
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESENTATION HELPERS — pure UI components consuming the verified view models
// ─────────────────────────────────────────────────────────────────────────────

// Label color for the qualitative-state pills; each label maps to one tone.
function snapshotPillStyle(text: string): { bg: string; fg: string; border: string } {
  // Complete / Identified / Disclosed / Fully Evaluated → settled green-ish
  if (/^(Complete|Identified|Disclosed|Fully Evaluated)$/.test(text)) {
    return { bg: "rgba(16,185,129,0.10)", fg: "#34D399", border: "rgba(16,185,129,0.3)" };
  }
  // Partial / Flagged, undisclosed / Substantially Evaluated → in-progress amber
  if (/^(Partial|Flagged, undisclosed|Substantially Evaluated)$/.test(text)) {
    return { bg: "rgba(245,158,11,0.10)", fg: "#FBBF24", border: "rgba(245,158,11,0.3)" };
  }
  // Inputs Started / Preliminary / Not disclosed → cool neutral
  if (/^(Inputs Started|Preliminary|Not disclosed|Not identified)$/.test(text)) {
    return { bg: "rgba(99,102,241,0.10)", fg: "#A5B4FC", border: "rgba(99,102,241,0.3)" };
  }
  // Not yet computable / Not yet evaluated / Not Started → faint
  return { bg: "rgba(255,255,255,0.04)", fg: "#9CA3AF", border: "rgba(255,255,255,0.10)" };
}

function SnapshotRow({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  const s = snapshotPillStyle(value);
  return (
    <div onClick={onClick} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: onClick ? "pointer" : "default" }}>
      <span style={{ fontSize: 11.5, color: MUTE, letterSpacing: "0.02em" }}>{label}</span>
      <span style={{
        display: "inline-block", padding: "3px 9px", borderRadius: 4,
        background: s.bg, color: s.fg, border: `1px solid ${s.border}`,
        fontSize: 11.5, fontWeight: 600,
      }}>{value}</span>
    </div>
  );
}

/**
 * The Tax Snapshot card — the canonical summary layer. Consumes a TaxSnapshot
 * view model (no business logic embedded here).
 *
 * Per Step 6 refinement: when readiness is 5/6 and the *only* missing
 * applicable category is recovery classes, AND no equipment/RP is allocated,
 * the UI shows "Not applicable" inline so 5/6 isn't read as an error.
 * NOTE: the helpers already omit "classes" from `unmet` when not applicable —
 * this UI hint exists purely to *explain* the 5/6 to the user.
 */
function TaxSnapshotCard({ snap, rec, onInspect }: { snap: TaxSnapshot; rec: TaxAssumptionRecord; onInspect?: (rowId: SnapshotRowId) => void }) {
  const noRecoveryAllocation = !(rec.ppa_equipment ?? 0) && !(rec.ppa_real_property ?? 0);
  const showNotApplicableHint =
    snap.readiness.ready === 5 && snap.readiness.total === 6 && noRecoveryAllocation
    && rec.ppa_structure !== "unspecified" && rec.entity_type !== "unknown"
    && rec.seller_basis_disclosed !== "unknown" && rec.nols_disclosed !== "unknown"
    && ((rec.ppa_goodwill ?? 0) > 0 || (rec.ppa_intangibles ?? 0) > 0 || (rec.ppa_working_capital ?? 0) > 0);

  const go = (id: SnapshotRowId) => onInspect ? () => onInspect(id) : undefined;
  const cursor = onInspect ? "pointer" : "default";

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: INK, textTransform: "uppercase", letterSpacing: "0.08em" }}>Tax Snapshot</span>
        <span style={{ fontSize: 10, color: MUTE, fontStyle: "italic" }}>evidence-status — not a deal score · click a row to inspect</span>
      </div>
      <div style={{ padding: "8px 16px 14px" }}>
        <SnapshotRow label="Structure"             value={snap.structure_label}    onClick={go("structure")} />
        <SnapshotRow label="Entity"                value={snap.entity_label}       onClick={go("entity")} />
        <SnapshotRow label="Basis Recovery"        value={snap.basis_recovery}     onClick={go("basis_recovery")} />
        <SnapshotRow label="Recapture Exposure"    value={snap.recapture_exposure} onClick={go("recapture_exposure")} />
        <SnapshotRow label="NOL Position"          value={snap.nol_position}       onClick={go("nol_position")} />
        <div onClick={go("readiness")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor }}>
          <span style={{ fontSize: 11.5, color: MUTE, letterSpacing: "0.02em" }}>Structure Readiness</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: VIOLET, fontFamily: "ui-monospace, monospace" }}>
              {snap.readiness.ready} / {snap.readiness.total}
            </span>
            {showNotApplicableHint && (
              <span style={{ fontSize: 10, color: MUTE, fontStyle: "italic" }}>
                · recovery classes: not applicable
              </span>
            )}
          </span>
        </div>
        <SnapshotRow label="Tax Structure Evaluated" value={snap.evaluated} onClick={go("evaluated")} />
        <div onClick={go("key_missing_input")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor }}>
          <span style={{ fontSize: 11.5, color: MUTE, letterSpacing: "0.02em" }}>Key Missing Input</span>
          <span style={{ fontSize: 11.5, color: snap.key_missing_input === "—" ? "#34D399" : "#FBBF24", textAlign: "right", maxWidth: "65%" }}>
            {snap.key_missing_input}
          </span>
        </div>
        <div onClick={go("evidence_gap")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", cursor }}>
          <span style={{ fontSize: 11.5, color: MUTE, letterSpacing: "0.02em" }}>Evidence Gap</span>
          <span style={{ fontSize: 11.5, color: snap.evidence_gap === "—" ? "#34D399" : "#A5B4FC", textAlign: "right", maxWidth: "65%" }}>
            {snap.evidence_gap}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Tax Facts section — what the buyer has entered, seam-tagged.
 */
function TaxFactsSection({ view, onInspect }: { view: TaxFactsView; onInspect?: (line: TaxFactsView["lines"][number]) => void }) {
  if (view.lines.length === 0) {
    return (
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: INK, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Tax Facts</div>
        <div style={{ fontSize: 11.5, color: MUTE, fontStyle: "italic" }}>No tax assumptions entered yet.</div>
      </div>
    );
  }
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: INK, textTransform: "uppercase", letterSpacing: "0.08em" }}>Tax Facts</span>
        <span style={{ fontSize: 10, color: MUTE, fontStyle: "italic", marginLeft: 10 }}>what you've entered</span>
      </div>
      <div style={{ padding: "10px 16px 14px" }}>
        {view.lines.map((ln, i) => (
          <div key={i} onClick={onInspect ? () => onInspect(ln) : undefined} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < view.lines.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", cursor: onInspect ? "pointer" : "default" }}>
            <span style={{ fontSize: 11.5, color: MUTE }}>
              {ln.label}
              <span style={{
                marginLeft: 8, padding: "1px 6px", borderRadius: 3, fontSize: 8.5, fontWeight: 700,
                letterSpacing: "0.04em", textTransform: "uppercase",
                background: ln.seam === "fact" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                color: ln.seam === "fact" ? "#34D399" : "#FBBF24",
              }}>{ln.seam === "fact" ? "imported from deal" : "buyer input"}</span>
            </span>
            <span style={{ fontSize: 12, color: INK, fontWeight: 600 }}>{ln.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Tax Implications section — categorical reads + schedules + honest absence.
 */
function TaxImplicationsSection({ view, onInspectStatement, onInspectSchedule }: {
  view: TaxImplicationsView;
  onInspectStatement?: (st: TaxImplicationsView["statements"][number]) => void;
  onInspectSchedule?: (sch: TaxImplicationsView["schedules"][number]) => void;
}) {
  const empty = view.statements.length === 0 && view.schedules.length === 0 && view.absent.length === 0;
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: INK, textTransform: "uppercase", letterSpacing: "0.08em" }}>Tax Implications</span>
        <span style={{ fontSize: 10, color: MUTE, fontStyle: "italic", marginLeft: 10 }}>what those facts mean</span>
      </div>
      <div style={{ padding: "14px 16px" }}>
        {empty && <div style={{ fontSize: 11.5, color: MUTE, fontStyle: "italic" }}>Nothing computable yet from current inputs.</div>}

        {view.statements.map((st, i) => (
          <div key={`s${i}`} onClick={onInspectStatement ? () => onInspectStatement(st) : undefined} style={{ marginBottom: 14, cursor: onInspectStatement ? "pointer" : "default" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 4 }}>
              {st.heading}
              <span style={{
                marginLeft: 8, padding: "1px 6px", borderRadius: 3, fontSize: 8.5, fontWeight: 700,
                letterSpacing: "0.04em", textTransform: "uppercase",
                background: st.seam === "fact" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                color: st.seam === "fact" ? "#34D399" : "#FBBF24",
              }}>{st.seam === "fact" ? "imported from deal" : "buyer input"}</span>
            </div>
            <div style={{ fontSize: 11.5, color: MUTE, lineHeight: 1.45 }}>{st.body}</div>
          </div>
        ))}

        {view.schedules.map((sch, i) => (
          <div key={`sch${i}`} onClick={onInspectSchedule ? () => onInspectSchedule(sch) : undefined} style={{ marginTop: 16, marginBottom: 8, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)", cursor: onInspectSchedule ? "pointer" : "default" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 3 }}>{sch.heading}</div>
            {sch.basis_note && <div style={{ fontSize: 10.5, color: FAINT, fontStyle: "italic", marginBottom: 8 }}>{sch.basis_note}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "4px 12px", marginBottom: 6 }}>
              {sch.rows.map((r, j) => (
                <div key={j} style={{ fontSize: 11, color: MUTE, fontFamily: "ui-monospace, monospace" }}>
                  <span style={{ color: FAINT }}>{r.label}:</span>{" "}
                  <span style={{ color: INK }}>{r.amount === null ? "—" : "$" + Math.round(r.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
            {sch.total !== null && (
              <div style={{ fontSize: 11.5, fontWeight: 700, color: VIOLET, fontFamily: "ui-monospace, monospace" }}>
                Total: ${Math.round(sch.total).toLocaleString()}
              </div>
            )}
          </div>
        ))}

        {view.absent.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTE, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Not yet specified</div>
            {view.absent.map((n, i) => (
              <div key={i} style={{ fontSize: 11, color: FAINT, lineHeight: 1.5, marginBottom: 3 }}>· {n}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Structural Comparison panel — shared presentation, v1 receives Tax rows only.
 */
function StructuralComparisonPanel({ plan, onInspect }: { plan: StructuralComparisonPanelPlan; onInspect?: (dimensionId: string) => void }) {
  if (!plan.visible) return null;
  const visibleRows = plan.comparison_rows.filter(r => r.visible);
  const cols = plan.columns;

  const structLabel: Record<string, string> = {
    asset: "Asset purchase", stock: "Stock purchase",
    stock_with_338_h_10: "Stock + §338(h)(10)", stock_with_336_e: "Stock + §336(e)",
  };
  const emphasisColor = (e: string) =>
    e === "primary" ? VIOLET : e === "secondary" ? "#A5B4FC" : e === "muted" ? FAINT : MUTE;

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: INK, textTransform: "uppercase", letterSpacing: "0.08em" }}>Structural Comparison</span>
        <span style={{ fontSize: 10, color: MUTE, fontStyle: "italic", marginLeft: 10 }}>
          structural differences between transaction structures
        </span>
      </div>
      <div style={{ padding: "14px 16px", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px 10px 8px 0", color: FAINT, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", width: 180, verticalAlign: "bottom" }}>Dimension</th>
              {cols.map(col => (
                <th key={col.structure} style={{ textAlign: "left", padding: "8px 10px", color: emphasisColor(col.emphasis), fontWeight: 700, fontSize: 11, verticalAlign: "bottom" }}>
                  {structLabel[col.structure] ?? col.structure}
                  {col.emphasis === "primary" && (
                    <span style={{ display: "block", marginTop: 2, fontSize: 8.5, color: VIOLET, fontStyle: "italic", fontWeight: 400 }}>selected</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.dimension} onClick={onInspect ? () => onInspect(row.dimension) : undefined} style={{ borderTop: "1px solid rgba(255,255,255,0.04)", cursor: onInspect ? "pointer" : "default" }}>
                <td style={{ padding: "10px 10px 10px 0", color: MUTE, fontWeight: 600, verticalAlign: "top" }}>{row.dimension_label}</td>
                {cols.map(col => {
                  const v = row.by_structure[col.structure];
                  return (
                    <td key={col.structure} style={{ padding: "10px", color: col.emphasis === "muted" ? FAINT : INK, lineHeight: 1.5, verticalAlign: "top" }}>
                      {v === null || v === undefined || v === "" ? <span style={{ color: FAINT }}>—</span> : v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 14, padding: "10px 12px", background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 8, fontSize: 11.5, color: MUTE, lineHeight: 1.55 }}>
          {plan.bottom_line}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH B — Calculated Difference card (Quantitative basis delta + tax shield)
// ─────────────────────────────────────────────────────────────────────────────
// Workspace-only view of the structural implications of current assumptions.
// All three sections render data the engine already produced; nothing here
// recalculates schedules. The tax shield section is ANALYSIS ONLY and never
// enters institutional output (Executive Snapshot or AcquiFlow-Intel memo).
// ─────────────────────────────────────────────────────────────────────────────
function CalculatedDifferenceCard({ view, onInspect }: { view: BasisDeltaView; onInspect?: (valueId: CalcDiffValueId) => void }) {
  const fmt = (n: number | null): string => n === null ? "—" : "$" + Math.round(n).toLocaleString("en-US");
  const fmtDiff = (n: number | null): string => n === null ? "—" : (n >= 0 ? "+" : "") + "$" + Math.round(Math.abs(n)).toLocaleString("en-US");
  const go = (id: CalcDiffValueId) => onInspect ? () => onInspect(id) : undefined;
  const cursor = onInspect ? "pointer" : "default";

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: INK, textTransform: "uppercase", letterSpacing: "0.08em" }}>Calculated Difference</span>
        <span style={{
          padding: "2px 8px", borderRadius: 3, fontSize: 9, fontWeight: 700,
          letterSpacing: "0.04em", textTransform: "uppercase",
          background: "rgba(245,158,11,0.10)", color: "#FBBF24",
          border: "1px solid rgba(245,158,11,0.3)",
        }}>Analysis only</span>
      </div>
      <div style={{ padding: "14px 16px" }}>
        {!view.computable && (
          <div style={{ fontSize: 12, color: MUTE, fontStyle: "italic" }}>
            {view.absent_reason ?? "Not yet computable from current inputs."}
          </div>
        )}

        {view.computable && (
          <>
            {/* Section 1 — Basis Delta */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: FAINT, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>New recoverable tax basis</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: FAINT, marginBottom: 3 }}>Asset purchase</div>
                  <div onClick={go("asset_recoverable_basis")} style={{ fontSize: 17, fontWeight: 700, color: INK, fontFamily: "ui-monospace, monospace", cursor }}>{fmt(view.asset_recoverable_basis)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: FAINT, marginBottom: 3 }}>Stock purchase</div>
                  <div onClick={go("stock_recoverable_basis")} style={{ fontSize: 17, fontWeight: 700, color: MUTE, fontFamily: "ui-monospace, monospace", cursor }}>{fmt(view.stock_recoverable_basis)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: FAINT, marginBottom: 3 }}>Difference</div>
                  <div onClick={go("basis_difference")} style={{ fontSize: 17, fontWeight: 700, color: VIOLET, fontFamily: "ui-monospace, monospace", cursor }}>{fmtDiff(view.basis_difference)}</div>
                </div>
              </div>
              {view.partial_gap_note && (
                <div style={{ marginTop: 8, fontSize: 11, color: "#FBBF24", fontStyle: "italic" }}>
                  {view.partial_gap_note}
                </div>
              )}
            </div>

            {/* Section 2 — Year 1 Recovery Delta */}
            <div style={{ marginBottom: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: FAINT, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Year 1 basis recovery</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: FAINT, marginBottom: 3 }}>Asset purchase</div>
                  <div onClick={go("asset_year1_recovery")} style={{ fontSize: 15, fontWeight: 600, color: INK, fontFamily: "ui-monospace, monospace", cursor }}>{fmt(view.asset_year1_recovery)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: FAINT, marginBottom: 3 }}>Stock purchase</div>
                  <div onClick={go("stock_year1_recovery")} style={{ fontSize: 15, fontWeight: 600, color: MUTE, fontFamily: "ui-monospace, monospace", cursor }}>{fmt(view.stock_year1_recovery)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: FAINT, marginBottom: 3 }}>Difference</div>
                  <div onClick={go("year1_recovery_difference")} style={{ fontSize: 15, fontWeight: 600, color: VIOLET, fontFamily: "ui-monospace, monospace", cursor }}>{fmtDiff(view.year1_recovery_difference)}</div>
                </div>
              </div>
            </div>

            {/* Section 3 — Optional Tax Shield Preview */}
            <div style={{ paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: FAINT, textTransform: "uppercase", letterSpacing: "0.06em" }}>Estimated Year 1 tax shield</span>
                {view.tax_shield_year1 !== null && (
                  <span style={{
                    padding: "1px 6px", borderRadius: 3, fontSize: 8.5, fontWeight: 700,
                    letterSpacing: "0.04em", textTransform: "uppercase",
                    background: "rgba(245,158,11,0.10)", color: "#FBBF24",
                  }}>Analysis only</span>
                )}
              </div>
              {view.tax_shield_year1 !== null ? (
                <div onClick={go("tax_shield_year1")} style={{ fontSize: 17, fontWeight: 700, color: "#FBBF24", fontFamily: "ui-monospace, monospace", cursor }}>
                  {fmt(view.tax_shield_year1)}
                  <span style={{ marginLeft: 10, fontSize: 11, color: MUTE, fontWeight: 400, fontFamily: FONT }}>
                    ({fmt(view.asset_year1_recovery)} × {Math.round((view.buyer_ordinary_rate ?? 0) * 100)}%)
                  </span>
                </div>
              ) : (
                <div onClick={go("tax_shield_year1")} style={{ fontSize: 12, color: MUTE, fontStyle: "italic", cursor }}>
                  {view.tax_shield_message}
                </div>
              )}
            </div>

            {/* Election note (only for 338/336 selections) */}
            {view.election_note && (
              <div style={{ marginTop: 14, padding: "10px 12px", background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 8, fontSize: 11.5, color: MUTE, lineHeight: 1.5 }}>
                {view.election_note}
              </div>
            )}
          </>
        )}
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

  // Tax Fact Drilldown — the drawer's view model (null = closed).
  const [drilldown, setDrilldown] = useState<DrilldownViewModel | null>(null);

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

  // ── LIVE PREVIEW VIEW MODELS (Step 6) ──
  // The Tax workspace is a working analytical tool: as inputs change, the preview
  // recomputes via pure helpers (no IO, no engine changes). The four view models
  // below are the ONLY thing the React UI consumes — Invariant 1.
  const livePreview = useMemo(() => {
    if (!rec) return null;
    const engineRec = recToEngineRec(rec);
    const section = buildTaxStructureSection(recToBuilderRow(rec));
    // Patch B: compute all four structure-variant sections once. Both the
    // Structural Comparison and the Calculated Difference card consume them.
    // This is the Invariant 1 discipline: one set of engine runs per render.
    const sections = buildStructureSections(engineRec);
    const snap = buildTaxSnapshot(engineRec, section);
    const facts = buildTaxFactsView(engineRec);
    const implications = buildTaxImplicationsView(section);
    const comparisonRows = buildTaxComparisonRows(engineRec, sections);
    const comparisonPlan = buildStructuralComparisonPanel(engineRec, comparisonRows);
    const basisDelta = buildBasisDeltaView(engineRec, sections.asset, sections.stock);
    return { snap, facts, implications, comparisonPlan, basisDelta };
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
          {/* ── Tax Snapshot card (Step 6 — canonical summary layer) ── */}
          {livePreview && <TaxSnapshotCard snap={livePreview.snap} rec={rec} onInspect={(rowId) => setDrilldown(buildSnapshotDrilldown(livePreview.snap, rowId))} />}

          {/* (The old "readiness narrative" block was removed in Patch Batch A. */}
          {/*  Its content duplicated — and conflicted with — the Snapshot card */}
          {/*  above, which now surfaces readiness, Key Missing Input, and        */}
          {/*  Evidence Gap with mechanically-derived precision. The Snapshot is */}
          {/*  the canonical summary layer per Invariant 1.)                     */}

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
                {/* Fix #3 (Patch Batch A): the "Recapture-sensitive classes */}
                {/* present?" TriField was removed here per Decision #1. The */}
                {/* value is now mechanically derived in the adapter from PPA */}
                {/* allocations (equipment > 0 || real_property > 0). The DB */}
                {/* column persists for legacy data but is no longer source  */}
                {/* of truth and is not displayed to buyers.                  */}
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

          {/* ── LIVE PREVIEW: Facts → Implications → Structural Comparison ── */}
          {/* Per the live-preview architecture, what the user enters above */}
          {/* flows into these sections immediately. Same builder output the */}
          {/* Executive Snapshot report will consume — Invariant 1. */}
          {livePreview && (
            <>
              <TaxFactsSection
                view={livePreview.facts}
                onInspect={(line) => setDrilldown(buildTaxFactDrilldown(line))}
              />
              <TaxImplicationsSection
                view={livePreview.implications}
                onInspectStatement={(st) => setDrilldown(buildImplicationStatementDrilldown(st))}
                onInspectSchedule={(sch) => setDrilldown(buildImplicationScheduleDrilldown(sch))}
              />
              <CalculatedDifferenceCard
                view={livePreview.basisDelta}
                onInspect={(id) => setDrilldown(buildCalcDiffDrilldown(livePreview.basisDelta, id))}
              />
              <StructuralComparisonPanel
                plan={livePreview.comparisonPlan}
                onInspect={(dim) => setDrilldown(buildComparisonDrilldown(livePreview.comparisonPlan, dim))}
              />
            </>
          )}
        </>
      )}

      {/* ── Tax Fact Drilldown drawer (position: fixed; renders above everything) ── */}
      <TaxDrilldownDrawer vm={drilldown} onClose={() => setDrilldown(null)} />
    </div>
  );
}
