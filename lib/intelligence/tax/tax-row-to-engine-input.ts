// lib/intelligence/tax/tax-row-to-engine-input.ts
// ═════════════════════════════════════════════════════════════════════════════
// READ-SIDE ADAPTER — deal_tax_assumptions row → frozen tax-engine inputs.
//
// Lets the AcquiFlow-Intel report's Structure section consume the assumptions the
// buyer saved in the Tax Assumptions tab. PURE boundary mapper: no IO, no engine
// changes, no computation. The engine (L1–L4) stays frozen; this translates the
// persisted TAX-DATA-MODEL row shape into the engine's input type names.
//
// Two kinds of translation happen here and ONLY here:
//   1. FIELD RENAMES   — entity_type→target_entity_type, ppa_structure→deal_structure,
//                        asset_*_class→ppa_*_class, ppa_intangibles→ppa_other_intangibles,
//                        state_footprint→states_of_operation, flat basis cols→nested.
//   2. VALUE TRANSFORMS — DB enum values differ from engine enum values:
//        structure:  stock_338_h_10 → stock_with_338_h_10
//                    stock_336_e    → stock_with_336_e
//        entity:     partnership    → llc_partnership
//                    disregarded_llc→ llc_disregarded
//        tri-state:  'yes'/'no'/'unknown' → true/false/null
//
// COMPUTED/OPS-only fields (ppa_shield_value / ppa_after_tax_delta /
// recapture_tax_dollar) are not in the row and never enter here — the firewall is
// upstream (DB table + write strip). This adapter only ever sees INST-eligible data.
//
// NOTE (deferred): eventually the engine's type names get conformed to
// TAX-DATA-MODEL and this adapter shrinks to a near-identity map. Until then it is
// the single, documented place the two naming systems meet.
// ═════════════════════════════════════════════════════════════════════════════

import type {
  TaxCanonicalFacts, TaxScenarioAssumptions,
} from "./tax-consequence-calculator";
import type { SellerNoteInput } from "./tax-consequence-calculator";

export const TAX_ADAPTER_VERSION = "tax-row-adapter-v1.0.0";

// ── the persisted row shape (mirror of deal_tax_assumptions columns) ──
// Kept local so this module has no dependency on the client component. A
// SELECT * FROM deal_tax_assumptions returns exactly this.
export interface DealTaxAssumptionsRow {
  deal_id: string;
  user_id?: string;
  // structure & entity
  ppa_structure: "unspecified" | "asset" | "stock" | "stock_338_h_10" | "stock_336_e";
  entity_type: "unknown" | "c_corp" | "s_corp" | "partnership" | "disregarded_llc" | "sole_prop";
  // seller basis & depreciation disclosures
  seller_basis_disclosed: "yes" | "no" | "unknown";
  existing_basis_goodwill: number | null;
  existing_basis_equipment: number | null;
  existing_basis_real_property: number | null;
  existing_basis_intangibles: number | null;
  existing_basis_working_capital: number | null;
  prior_depreciation_disclosed: "yes" | "no" | "unknown";
  asset_accum_depreciation: number | null;
  recapture_sensitive_present: "yes" | "no" | "unknown";
  // NOLs
  nols_disclosed: "yes" | "no" | "unknown";
  nol_amount: number | null;
  // PPA allocations
  ppa_goodwill: number | null;
  ppa_equipment: number | null;
  ppa_real_property: number | null;
  ppa_intangibles: number | null;
  ppa_working_capital: number | null;
  asset_equipment_class: "unspecified" | "5yr" | "7yr";
  asset_real_property_class: "unspecified" | "nonresidential_39yr" | "residential_27_5yr";
  // seller note
  debt_seller_note_principal: number | null;
  debt_seller_note_rate: number | null;
  debt_seller_note_term: number | null;
  // planning rates
  buyer_ordinary_rate: number | null;
  buyer_capital_rate: number | null;
  seller_ordinary_rate: number | null;
  seller_capital_rate: number | null;
  // state
  state_footprint: string[] | null;
  // provenance (carried, not consumed by the calculator)
  source_type?: string;
  evidence_quality?: string;
}

// optional deal-level context the row doesn't carry (state of organization, etc.)
export interface DealContextLite {
  state_of_organization?: string | null;
}

// the full bundle the engine entrypoint accepts
export interface TaxEngineInput {
  canon: TaxCanonicalFacts;
  scenario: TaxScenarioAssumptions;
  sellerNote: SellerNoteInput | null;
}

// ── value transforms (the ONLY place DB↔engine enum values are reconciled) ──
function mapStructure(v: DealTaxAssumptionsRow["ppa_structure"]): TaxScenarioAssumptions["deal_structure"] {
  switch (v) {
    case "stock_338_h_10": return "stock_with_338_h_10";
    case "stock_336_e":    return "stock_with_336_e";
    case "asset":          return "asset";
    case "stock":          return "stock";
    case "unspecified":    return "unspecified";
    default:               return "unspecified";
  }
}

function mapEntity(v: DealTaxAssumptionsRow["entity_type"]): TaxCanonicalFacts["target_entity_type"] {
  switch (v) {
    case "partnership":     return "llc_partnership";
    case "disregarded_llc": return "llc_disregarded";
    case "c_corp":          return "c_corp";
    case "s_corp":          return "s_corp";
    case "sole_prop":       return "sole_prop";
    case "unknown":         return "unknown";
    default:                return "unknown";
  }
}

// tri-state → boolean|null (honest absence: 'unknown' → null)
function triToBool(v: "yes" | "no" | "unknown"): boolean | null {
  return v === "yes" ? true : v === "no" ? false : null;
}

// numeric helpers (treat NaN/undefined as null; never fabricate)
function num(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// ── the adapter ──
export function rowToEngineInput(
  row: DealTaxAssumptionsRow,
  ctx: DealContextLite = {},
): TaxEngineInput {
  // existing basis: flat columns → nested object (omit nulls so the engine's
  // optional-keyed shape is clean; engine treats absent keys as not-disclosed-for-class)
  const basis: NonNullable<TaxCanonicalFacts["existing_tax_basis_by_class"]> = {};
  if (num(row.existing_basis_goodwill)        !== null) basis.goodwill        = num(row.existing_basis_goodwill)!;
  if (num(row.existing_basis_equipment)       !== null) basis.equipment       = num(row.existing_basis_equipment)!;
  if (num(row.existing_basis_real_property)   !== null) basis.real_property   = num(row.existing_basis_real_property)!;
  if (num(row.existing_basis_intangibles)     !== null) basis.other_intangibles = num(row.existing_basis_intangibles)!;
  if (num(row.existing_basis_working_capital) !== null) basis.working_capital = num(row.existing_basis_working_capital)!;
  const basisDisclosed = triToBool(row.seller_basis_disclosed);

  const canon: TaxCanonicalFacts = {
    target_entity_type: mapEntity(row.entity_type),
    state_of_organization: ctx.state_of_organization ?? null,
    states_of_operation: Array.isArray(row.state_footprint) ? row.state_footprint : [],
    // foreign flag is not collected on this row (informational, deferred) → null = unknown
    foreign_operations_present: null,
    disclosed_nols_present: triToBool(row.nols_disclosed),
    disclosed_nol_amount: num(row.nol_amount),
    // engine reads accelerated_depreciation_present as a number|null (amount or absent).
    // The row carries the amount in asset_accum_depreciation; the prior_depreciation_disclosed
    // tri-state gates whether the amount is meaningful. If disclosed 'no' or 'unknown', null.
    accelerated_depreciation_present:
      row.prior_depreciation_disclosed === "yes" ? num(row.asset_accum_depreciation) : null,
    recapture_sensitive_classes_present: triToBool(row.recapture_sensitive_present),
    existing_tax_basis_disclosed: basisDisclosed,
    // only attach the nested basis when disclosed AND at least one class present
    existing_tax_basis_by_class:
      basisDisclosed === true && Object.keys(basis).length > 0 ? basis : null,
  };

  const scenario: TaxScenarioAssumptions = {
    deal_structure: mapStructure(row.ppa_structure),
    ppa_goodwill: num(row.ppa_goodwill),
    ppa_equipment: num(row.ppa_equipment),
    ppa_equipment_class: row.asset_equipment_class,                 // values match engine 1:1
    ppa_real_property: num(row.ppa_real_property),
    ppa_real_property_class: row.asset_real_property_class,         // values match engine 1:1
    ppa_other_intangibles: num(row.ppa_intangibles),               // rename
    ppa_working_capital: num(row.ppa_working_capital),
    buyer_ordinary_rate: num(row.buyer_ordinary_rate),
    buyer_capital_rate: num(row.buyer_capital_rate),
    seller_ordinary_rate: num(row.seller_ordinary_rate),
    seller_capital_rate: num(row.seller_capital_rate),
  };

  // seller note → engine SellerNoteInput (null when no principal, so the engine
  // simply does not emit the seller-note consequence — honest absence)
  const sellerNote: SellerNoteInput | null =
    num(row.debt_seller_note_principal) !== null
      ? {
          principal: num(row.debt_seller_note_principal),
          annual_rate: num(row.debt_seller_note_rate),
          term_years: num(row.debt_seller_note_term),
        }
      : null;

  return { canon, scenario, sellerNote };
}
