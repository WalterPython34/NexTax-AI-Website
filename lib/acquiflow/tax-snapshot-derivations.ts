// lib/acquiflow/tax-snapshot-derivations.ts
// ═════════════════════════════════════════════════════════════════════════════
// TAX SNAPSHOT DERIVATIONS — view models + pure helpers for the Tax Workspace.
//
// React consumes ONLY this module's types and functions.
// React must NEVER import TaxStructureSection directly (Invariant 1).
//
// This module is the workspace view-model layer. It reads TaxStructureSection
// (the canonical builder output) and produces workspace-specific view models
// for the Snapshot card, Tax Facts section, Tax Implications section, and
// the Tax rows of the Structural Comparison panel.
//
// All helpers are pure. No IO. No engine logic duplication — when a derivation
// needs to know what the engine produced, it reads section state.
// ═════════════════════════════════════════════════════════════════════════════

import type { TaxAssumptionRecord } from "@/components/TaxAssumptionsTab";
import type { TaxStructureSection } from "@/lib/acquiflow/tax-structure-section";
import type { StructuralComparisonRow } from "@/lib/acquiflow/structural-comparison";

export const TAX_SNAPSHOT_VERSION = "tax-snapshot-derivations-v1.0.0";

// ── Snapshot label types (string-union for exact test comparison) ──
export type BasisRecoveryLabel =
  | "Complete"
  | "Partial"
  | "Inputs Started"
  | "Not yet computable";

export type RecaptureExposureLabel =
  | "Identified"
  | "Flagged, undisclosed"
  | "Not identified"
  | "Not yet computable";

export type NolPositionLabel =
  | "Disclosed"
  | "Not disclosed"
  | "Not yet evaluated";

export type EvaluatedLabel =
  | "Not Started"
  | "Preliminary"
  | "Substantially Evaluated"
  | "Fully Evaluated";

// ── Readiness ──
export type ReadinessCategoryId =
  | "structure"
  | "entity"
  | "ppa"
  | "classes"
  | "basis_disclosure"
  | "nol_disclosure";

export interface StructureReadiness {
  ready: number;          // 0..6
  total: 6;               // literal — locks the denominator
  unmet: ReadinessCategoryId[];  // categories NOT met, in priority order
}

// ── full Snapshot view model ──
export interface TaxSnapshot {
  structure_label: string;
  entity_label: string;
  basis_recovery: BasisRecoveryLabel;
  recapture_exposure: RecaptureExposureLabel;
  nol_position: NolPositionLabel;
  readiness: StructureReadiness;
  evaluated: EvaluatedLabel;
  key_missing_input: string;     // "—" when none
  evidence_gap: string;          // "—" when none or suppressed
}

// ── Tax Facts view model (Section A) ──
export interface TaxFactLine {
  label: string;                 // e.g. "Acquisition structure"
  value: string;                 // e.g. "Asset purchase"
  seam: "fact" | "assumption";   // drives buyer-facing tag in UI
}
export interface TaxFactsView {
  lines: TaxFactLine[];
}

// ── Tax Implications view model (Section B) ──
export interface TaxImplicationStatement {
  heading: string;
  body: string;
  seam: "fact" | "assumption";
}
export interface TaxImplicationSchedule {
  heading: string;
  rows: Array<{ label: string; amount: number | null }>;
  total: number | null;
  basis_note: string | null;
}
export interface TaxImplicationsView {
  statements: TaxImplicationStatement[];
  schedules: TaxImplicationSchedule[];
  absent: string[];              // honest-absence lines
}

// ─────────────────────────────────────────────────────────────────────────────
// PURE DERIVATION HELPERS — bodies stubbed; tests fail with explicit error
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Counts how many of the 6 readiness categories the buyer has specified.
 * Reads the record only; does not consult the section (the engine has no
 * concept of "category specified" — that's a UI-completion question).
 */
export function deriveReadiness(rec: TaxAssumptionRecord): StructureReadiness {
  const ppaEntered =
    (rec.ppa_goodwill ?? 0) > 0 ||
    (rec.ppa_equipment ?? 0) > 0 ||
    (rec.ppa_real_property ?? 0) > 0 ||
    (rec.ppa_intangibles ?? 0) > 0 ||
    (rec.ppa_working_capital ?? 0) > 0;

  // Category 4 (classes): only applicable once equipment OR RP is allocated.
  // When no recovery-class-bearing allocation exists, this category is "not yet
  // applicable" and does NOT count toward readiness.
  const equipNeedsClass = (rec.ppa_equipment ?? 0) > 0;
  const rpNeedsClass = (rec.ppa_real_property ?? 0) > 0;
  const classesApplicable = equipNeedsClass || rpNeedsClass;
  const equipClassOk = !equipNeedsClass || rec.asset_equipment_class !== "unspecified";
  const rpClassOk = !rpNeedsClass || rec.asset_real_property_class !== "unspecified";
  const classesMet = classesApplicable && equipClassOk && rpClassOk;

  const checks: { id: ReadinessCategoryId; met: boolean; applicable: boolean }[] = [
    { id: "structure",         met: rec.ppa_structure !== "unspecified",        applicable: true },
    { id: "entity",            met: rec.entity_type !== "unknown",              applicable: true },
    { id: "ppa",               met: ppaEntered,                                  applicable: true },
    { id: "classes",           met: classesMet,                                  applicable: classesApplicable },
    { id: "basis_disclosure",  met: rec.seller_basis_disclosed !== "unknown",   applicable: true },
    { id: "nol_disclosure",    met: rec.nols_disclosed !== "unknown",           applicable: true },
  ];

  const ready = checks.filter(c => c.met).length;
  // unmet only includes APPLICABLE categories that aren't met — a not-yet-applicable
  // category (like classes when no equipment/RP allocated) is neither met nor missing.
  const unmet = checks.filter(c => c.applicable && !c.met).map(c => c.id);

  return { ready, total: 6, unmet };
}

/**
 * Maps the buyer's PPA + section's computed-schedule state to the four-label
 * recovery progress indicator. Reads the section because the labels reflect
 * what the engine actually produced (Invariant 1).
 */
export function deriveBasisRecovery(
  rec: TaxAssumptionRecord,
  section: TaxStructureSection,
): BasisRecoveryLabel {
  // Recovery-bearing PPA classes: goodwill/intangibles (→ §197), equipment (→ MACRS eq),
  // real property (→ MACRS rp). Working capital does not produce a recovery schedule.
  const hasGoodwill = (rec.ppa_goodwill ?? 0) > 0 || (rec.ppa_intangibles ?? 0) > 0;
  const hasEquipment = (rec.ppa_equipment ?? 0) > 0;
  const hasRealProp = (rec.ppa_real_property ?? 0) > 0;
  const anyRecoveryBearing = hasGoodwill || hasEquipment || hasRealProp;

  if (!anyRecoveryBearing) return "Not yet computable";

  // Inputs Started: recovery-bearing PPA entered but the analysis hasn't framed
  // yet — buyer hasn't chosen a structure. (Engine may still fire §197 from
  // goodwill alone, but the *analytical direction* isn't set.)
  if (rec.ppa_structure === "unspecified") return "Inputs Started";

  // Otherwise: count expected schedules vs actual schedules. If every recovery-
  // bearing class produced its schedule, Complete. Otherwise Partial.
  const has197 = section.schedules.some(s => s.heading.includes("197"));
  const hasEquipSched = section.schedules.some(s => s.heading.includes("Equipment cost recovery"));
  const hasRpSched = section.schedules.some(s => s.heading.includes("Real-property cost recovery"));

  const expectations: boolean[] = [];
  if (hasGoodwill) expectations.push(has197);
  if (hasEquipment) expectations.push(hasEquipSched);
  if (hasRealProp) expectations.push(hasRpSched);

  return expectations.every(Boolean) ? "Complete" : "Partial";
}

/**
 * Maps the buyer's allocations + section's emitted recapture statements
 * to the four-label exposure indicator.
 */
export function deriveRecaptureExposure(
  rec: TaxAssumptionRecord,
  section: TaxStructureSection,
): RecaptureExposureLabel {
  const hasEquipment = (rec.ppa_equipment ?? 0) > 0;
  const hasRealProp = (rec.ppa_real_property ?? 0) > 0;
  // No recapture-bearing allocation → no read.
  if (!hasEquipment && !hasRealProp) return "Not yet computable";

  // Did the engine fire a §1245 or §1250 character statement?
  const fired = section.statements.some(s =>
    s.heading.includes("1245") || s.heading.includes("1250")
  );

  if (!fired) return "Not identified";

  // Statement fired. Identified vs Flagged-undisclosed depends on whether prior
  // depreciation has been substantiated.
  const priorDisclosed =
    rec.prior_depreciation_disclosed === "yes" &&
    rec.asset_accum_depreciation !== null;

  return priorDisclosed ? "Identified" : "Flagged, undisclosed";
}

/**
 * Direct passthrough of the disclosure tri-state with workspace labels.
 */
export function deriveNolPosition(rec: TaxAssumptionRecord): NolPositionLabel {
  switch (rec.nols_disclosed) {
    case "yes":     return "Disclosed";
    case "no":      return "Not disclosed";
    case "unknown": return "Not yet evaluated";
  }
}

/**
 * The highest-priority unmet readiness category, rendered as a human line.
 * Returns "—" when all 6 are met. Priority order is fixed (see plan §3).
 */
// Priority order for "what to fill in next" — by leverage, not by check order.
// Higher-leverage inputs (those that unlock more downstream analysis) come first.
const KEY_MISSING_PRIORITY: ReadinessCategoryId[] = [
  "structure",         // 1: without this, almost nothing computes
  "ppa",               // 2: without this, no schedules at all
  "classes",           // 3: without these, schedules can't run on allocated classes
  "entity",            // 4: without this, election framing is generic
  "basis_disclosure",  // 5: gates remaining-basis read
  "nol_disclosure",    // 6: gates NOL statement
];

/**
 * Resolve which recovery-class line to surface based on which allocations
 * lack a class. Pure; reads the record only.
 */
function recoveryClassMissingLine(rec: TaxAssumptionRecord): string {
  const equipMissing = (rec.ppa_equipment ?? 0) > 0 && rec.asset_equipment_class === "unspecified";
  const rpMissing = (rec.ppa_real_property ?? 0) > 0 && rec.asset_real_property_class === "unspecified";
  if (equipMissing && rpMissing) return "Recovery class missing for equipment and real property.";
  if (equipMissing) return "Recovery class missing for equipment.";
  if (rpMissing) return "Recovery class missing for real property.";
  // Defensive fallback — shouldn't reach here when "classes" is in unmet, but
  // returns a sensible generic message rather than literal brackets.
  return "Recovery class missing.";
}

export function deriveKeyMissingInput(
  readiness: StructureReadiness,
  rec?: TaxAssumptionRecord,
): string {
  // Find the highest-priority unmet category (by KEY_MISSING_PRIORITY order, not unmet order).
  const first = KEY_MISSING_PRIORITY.find(id => readiness.unmet.includes(id));
  if (!first) return "—";
  switch (first) {
    case "structure":         return "Transaction structure not specified.";
    case "ppa":               return "Purchase-price allocation not entered.";
    case "classes":           return rec ? recoveryClassMissingLine(rec) : "Recovery class missing.";
    case "entity":            return "Target entity type not specified.";
    case "basis_disclosure":  return "Seller basis disclosure not provided.";
    case "nol_disclosure":    return "NOL disclosure not provided.";
  }
}

/**
 * The highest-priority applicable seller-substantiation case.
 * Returns "—" when none applies or when suppression is in effect
 * (Key Missing Input on categories structure/ppa/classes).
 */
// Categories that trigger Evidence Gap suppression: while one of these is the
// Key Missing Input, the buyer should fill more before chasing the seller.
const SUPPRESSION_CATEGORIES: ReadinessCategoryId[] = ["structure", "ppa", "classes"];

export function deriveEvidenceGap(
  rec: TaxAssumptionRecord,
  readiness: StructureReadiness,
): string {
  // Suppression: if KMI is on structure/ppa/classes, gap stays silent.
  const kmi = KEY_MISSING_PRIORITY.find(id => readiness.unmet.includes(id));
  if (kmi && SUPPRESSION_CATEGORIES.includes(kmi)) return "—";

  // Priority-ordered cases (first applicable wins).

  // Case 1: basis disclosed "yes" but per-class object is empty (all nulls).
  const basis = rec.existing_basis_by_class;
  const anyBasisClassFilled =
    basis.goodwill !== null || basis.equipment !== null ||
    basis.real_property !== null || basis.intangibles !== null ||
    basis.working_capital !== null;
  if (rec.seller_basis_disclosed === "yes" && !anyBasisClassFilled) {
    return "Seller has disclosed basis exists, but per-class amounts not yet provided. " +
      "Request basis-by-class breakdown for §197/MACRS schedule grounding.";
  }

  // Case 2: prior depreciation disclosed "yes" but no amount.
  if (rec.prior_depreciation_disclosed === "yes" && rec.asset_accum_depreciation === null) {
    return "Prior depreciation disclosed, amount not yet provided. " +
      "Request depreciation schedule for accurate §1245/§1250 character read.";
  }

  // Case 3: NOLs disclosed "yes" but no amount.
  if (rec.nols_disclosed === "yes" && rec.nol_amount === null) {
    return "NOLs disclosed, amount not yet provided. " +
      "Request NOL carryforward schedule and §382 history.";
  }

  // Case 4: seller note principal set but rate or term missing.
  if (
    (rec.debt_seller_note_principal ?? 0) > 0 &&
    (rec.debt_seller_note_rate === null || rec.debt_seller_note_term === null)
  ) {
    return "Seller note principal entered; rate or term still missing. " +
      "Request final note terms before LOI.";
  }

  // Case 5: full PPA entered, structure asset/338/336, basis disclosure not "yes".
  const ppaPresent =
    (rec.ppa_goodwill ?? 0) > 0 || (rec.ppa_equipment ?? 0) > 0 ||
    (rec.ppa_real_property ?? 0) > 0 || (rec.ppa_intangibles ?? 0) > 0;
  const deemedAssetStructure =
    rec.ppa_structure === "asset" ||
    rec.ppa_structure === "stock_with_338_h_10" ||
    rec.ppa_structure === "stock_with_336_e";
  if (ppaPresent && deemedAssetStructure && rec.seller_basis_disclosed !== "yes") {
    return "Purchase-price allocation entered as buyer assumption. " +
      "Seller's existing basis not yet disclosed — request to ground the §1245 upper bound.";
  }

  return "—";
}

/**
 * Milestone-based analytical maturity. See plan §3 Tax Structure Evaluated.
 * Reads the section to determine schedule-presence (floor for the upper tiers).
 */
export function deriveTaxStructureEvaluated(
  rec: TaxAssumptionRecord,
  section: TaxStructureSection,
  readiness: StructureReadiness,
  keyMissing: string,
  evidenceGap: string,
): EvaluatedLabel {
  // "Not Started": no meaningful inputs.
  const anyMeaningful =
    rec.ppa_structure !== "unspecified" ||
    rec.entity_type !== "unknown" ||
    (rec.ppa_goodwill ?? 0) > 0 || (rec.ppa_equipment ?? 0) > 0 ||
    (rec.ppa_real_property ?? 0) > 0 || (rec.ppa_intangibles ?? 0) > 0 ||
    (rec.ppa_working_capital ?? 0) > 0 ||
    rec.seller_basis_disclosed !== "unknown" ||
    rec.nols_disclosed !== "unknown" ||
    rec.prior_depreciation_disclosed !== "unknown";
  if (!anyMeaningful) return "Not Started";

  // "Fully Evaluated": all APPLICABLE readiness categories met + no gaps + schedules ≥ 1.
  // We check `unmet.length === 0` rather than `ready === 6` so a goodwill-only deal
  // (where the "classes" category is not-applicable and thus not counted toward
  // `ready`) can still reach Fully Evaluated when everything else is substantiated.
  // Readiness itself continues to display as e.g. 5/6 with a "not applicable" UI hint.
  if (
    readiness.unmet.length === 0 &&
    keyMissing === "—" &&
    evidenceGap === "—" &&
    section.schedules.length >= 1
  ) {
    return "Fully Evaluated";
  }

  // "Substantially Evaluated": structure + entity + PPA ≥1 class + schedules ≥1.
  const ppaPresent =
    (rec.ppa_goodwill ?? 0) > 0 || (rec.ppa_equipment ?? 0) > 0 ||
    (rec.ppa_real_property ?? 0) > 0 || (rec.ppa_intangibles ?? 0) > 0 ||
    (rec.ppa_working_capital ?? 0) > 0;
  if (
    rec.ppa_structure !== "unspecified" &&
    rec.entity_type !== "unknown" &&
    ppaPresent &&
    section.schedules.length >= 1
  ) {
    return "Substantially Evaluated";
  }

  // Otherwise: at least one of {structure, entity} entered, but milestones not yet reached.
  return "Preliminary";
}

/**
 * Tax's contribution to the Structural Comparison panel.
 * Returns the five v1-visible Tax dimension rows plus the type-reserved
 * transferability_considerations row (with visible:false).
 */
// Helper: run the builder for a counterfactual structure to get "what this
// structure would look like" without changing the buyer's actual selection.
function sectionForStructure(
  rec: TaxAssumptionRecord,
  structure: TaxAssumptionRecord["ppa_structure"],
): TaxStructureSection {
  // The builder consumes a DealTaxAssumptionsRow shape; build one inline that
  // mirrors recordToRow with mechanical recapture derivation.
  const eqRecaptureSensitive = (rec.ppa_equipment ?? 0) > 0 || (rec.ppa_real_property ?? 0) > 0;
  // Defer the import to avoid a cycle at module-load time.
  // (At runtime this is a no-op; the imports above already resolved.)
  // We deliberately use `as any` only for the cross-module row shape construction.
  const row = {
    deal_id: rec.deal_id ?? "test",
    ppa_structure: structure,
    entity_type: rec.entity_type,
    seller_basis_disclosed: rec.seller_basis_disclosed,
    existing_basis_goodwill: rec.existing_basis_by_class.goodwill,
    existing_basis_equipment: rec.existing_basis_by_class.equipment,
    existing_basis_real_property: rec.existing_basis_by_class.real_property,
    existing_basis_intangibles: rec.existing_basis_by_class.intangibles,
    existing_basis_working_capital: rec.existing_basis_by_class.working_capital,
    prior_depreciation_disclosed: rec.prior_depreciation_disclosed,
    asset_accum_depreciation: rec.asset_accum_depreciation,
    recapture_sensitive_present: eqRecaptureSensitive ? "yes" as const : "no" as const,
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
  // Lazy require to avoid hoist issues; safe because the builder is pure.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { buildTaxStructureSection: build } = require("@/lib/acquiflow/tax-structure-section") as
    typeof import("@/lib/acquiflow/tax-structure-section");
  return build(row);
}

// Extract a categorical statement's body by heading substring.
function findStatement(section: TaxStructureSection, headingFragment: string): string | null {
  const found = section.statements.find(s => s.heading.includes(headingFragment));
  return found ? found.body : null;
}

export function buildTaxComparisonRows(
  rec: TaxAssumptionRecord,
  _section: TaxStructureSection,
): StructuralComparisonRow[] {
  // Build sections for the four structure variants. Pure, no IO.
  const secAsset = sectionForStructure(rec, "asset");
  const secStock = sectionForStructure(rec, "stock");
  const sec338 = sectionForStructure(rec, "stock_with_338_h_10");
  const sec336 = sectionForStructure(rec, "stock_with_336_e");

  // For each dimension, pull the engine's own statement for the matching structure.
  const rows: StructuralComparisonRow[] = [
    {
      dimension: "basis_treatment",
      dimension_label: "Basis treatment",
      visible: true,
      by_structure: {
        asset: findStatement(secAsset, "Basis step-up"),
        stock: findStatement(secStock, "Remaining tax basis") ?? findStatement(secStock, "Basis step-up"),
        stock_with_338_h_10: findStatement(sec338, "Basis step-up"),
        stock_with_336_e: findStatement(sec336, "Basis step-up"),
      },
    },
    {
      dimension: "tax_attributes",
      dimension_label: "Tax attribute disposition",
      visible: true,
      by_structure: {
        asset: findStatement(secAsset, "Net operating losses") ??
               "Attributes generally remain with the historical entity in an asset acquisition.",
        stock: findStatement(secStock, "Net operating losses") ??
               "Attributes generally remain with the entity in a stock acquisition, subject to §382.",
        stock_with_338_h_10: findStatement(sec338, "Net operating losses"),
        stock_with_336_e: findStatement(sec336, "Net operating losses"),
      },
    },
    {
      dimension: "seller_recognition",
      dimension_label: "Seller recognition event",
      visible: true,
      by_structure: {
        asset: findStatement(secAsset, "Seller gain character"),
        stock: findStatement(secStock, "Seller gain character"),
        stock_with_338_h_10: findStatement(sec338, "Seller gain character"),
        stock_with_336_e: findStatement(sec336, "Seller gain character"),
      },
    },
    {
      dimension: "election_prereqs",
      dimension_label: "Election prerequisites",
      // visible only when an election structure is selected
      visible: rec.ppa_structure === "stock_with_338_h_10" || rec.ppa_structure === "stock_with_336_e",
      by_structure: {
        asset: null,
        stock: null,
        stock_with_338_h_10: findStatement(sec338, "§338(h)(10) election"),
        stock_with_336_e: findStatement(sec336, "§336(e) election"),
      },
    },
    {
      dimension: "evidence_required",
      dimension_label: "Evidence required to evaluate fully",
      visible: true,
      by_structure: {
        asset: secAsset.absent_notes.join(" "),
        stock: secStock.absent_notes.join(" "),
        stock_with_338_h_10: sec338.absent_notes.join(" "),
        stock_with_336_e: sec336.absent_notes.join(" "),
      },
    },
    // Type-reserved slot for the future Transferability module (Invariant 4).
    // Hidden in v1; the panel composer does not render rows with visible=false.
    {
      dimension: "transferability_considerations",
      dimension_label: "Transferability considerations",
      visible: false,
      by_structure: { asset: null, stock: null, stock_with_338_h_10: null, stock_with_336_e: null },
    },
  ];
  return rows;
}

// Label maps for Snapshot display (mirror the engine values; display only).
const STRUCTURE_LABEL: Record<TaxAssumptionRecord["ppa_structure"], string> = {
  asset: "Asset purchase",
  stock: "Stock purchase",
  stock_with_338_h_10: "Stock purchase + \u00A7338(h)(10)",
  stock_with_336_e: "Stock purchase + \u00A7336(e)",
  unspecified: "Not yet specified",
};
const ENTITY_LABEL: Record<TaxAssumptionRecord["entity_type"], string> = {
  c_corp: "C-Corporation",
  s_corp: "S-Corporation",
  llc_partnership: "LLC (taxed as partnership)",
  llc_disregarded: "Single-member / disregarded LLC",
  sole_prop: "Sole proprietorship",
  unknown: "Not yet specified",
};

/**
 * Composition: produce the full Snapshot view model from record + section.
 */
export function buildTaxSnapshot(
  rec: TaxAssumptionRecord,
  section: TaxStructureSection,
): TaxSnapshot {
  const readiness = deriveReadiness(rec);
  const keyMissing = deriveKeyMissingInput(readiness, rec);
  const evidenceGap = deriveEvidenceGap(rec, readiness);
  return {
    structure_label: STRUCTURE_LABEL[rec.ppa_structure] ?? "Not yet specified",
    entity_label: ENTITY_LABEL[rec.entity_type] ?? "Not yet specified",
    basis_recovery: deriveBasisRecovery(rec, section),
    recapture_exposure: deriveRecaptureExposure(rec, section),
    nol_position: deriveNolPosition(rec),
    readiness,
    evaluated: deriveTaxStructureEvaluated(rec, section, readiness, keyMissing, evidenceGap),
    key_missing_input: keyMissing,
    evidence_gap: evidenceGap,
  };
}

/**
 * Facts section view model — one line per entered fact, seam-tagged.
 */
export function buildTaxFactsView(rec: TaxAssumptionRecord): TaxFactsView {
  const lines: TaxFactLine[] = [];
  const fmt = (n: number) => `$${(n / 1_000_000).toFixed(2)}M`;

  if (rec.ppa_structure !== "unspecified") {
    lines.push({ label: "Acquisition structure", value: STRUCTURE_LABEL[rec.ppa_structure], seam: "fact" });
  }
  if (rec.entity_type !== "unknown") {
    lines.push({ label: "Target entity", value: ENTITY_LABEL[rec.entity_type], seam: "fact" });
  }
  if ((rec.ppa_goodwill ?? 0) > 0) lines.push({ label: "PPA — goodwill", value: fmt(rec.ppa_goodwill!), seam: "assumption" });
  if ((rec.ppa_equipment ?? 0) > 0) lines.push({ label: "PPA — equipment", value: fmt(rec.ppa_equipment!), seam: "assumption" });
  if ((rec.ppa_real_property ?? 0) > 0) lines.push({ label: "PPA — real property", value: fmt(rec.ppa_real_property!), seam: "assumption" });
  if ((rec.ppa_intangibles ?? 0) > 0) lines.push({ label: "PPA — other intangibles", value: fmt(rec.ppa_intangibles!), seam: "assumption" });
  if ((rec.ppa_working_capital ?? 0) > 0) lines.push({ label: "PPA — working capital", value: fmt(rec.ppa_working_capital!), seam: "assumption" });
  if (rec.asset_equipment_class !== "unspecified") {
    lines.push({ label: "Equipment recovery class", value: rec.asset_equipment_class, seam: "assumption" });
  }
  if (rec.asset_real_property_class !== "unspecified") {
    lines.push({ label: "Real-property recovery class", value: rec.asset_real_property_class, seam: "assumption" });
  }
  if (rec.seller_basis_disclosed === "yes") {
    lines.push({ label: "Seller basis disclosure", value: "Disclosed", seam: "assumption" });
  } else if (rec.seller_basis_disclosed === "no") {
    lines.push({ label: "Seller basis disclosure", value: "Not disclosed", seam: "assumption" });
  }
  if (rec.nols_disclosed === "yes") {
    const v = rec.nol_amount !== null ? `Yes ($${(rec.nol_amount / 1_000_000).toFixed(2)}M)` : "Yes (amount pending)";
    lines.push({ label: "NOLs disclosed", value: v, seam: "assumption" });
  } else if (rec.nols_disclosed === "no") {
    lines.push({ label: "NOLs disclosed", value: "No", seam: "assumption" });
  }
  if ((rec.debt_seller_note_principal ?? 0) > 0) {
    lines.push({ label: "Seller note", value: fmt(rec.debt_seller_note_principal!), seam: "fact" });
  }

  return { lines };
}

/**
 * Implications section view model — reshape of section data with seam tags.
 */
export function buildTaxImplicationsView(section: TaxStructureSection): TaxImplicationsView {
  return {
    statements: section.statements.map(s => ({
      heading: s.heading,
      body: s.body,
      seam: s.seam,
    })),
    schedules: section.schedules.map(sch => ({
      heading: sch.heading,
      rows: sch.rows,
      total: sch.total,
      basis_note: sch.basis_note,
    })),
    absent: section.absent_notes,
  };
}
