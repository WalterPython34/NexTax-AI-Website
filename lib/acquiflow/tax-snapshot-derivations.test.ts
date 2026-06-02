// lib/acquiflow/tax-snapshot-derivations.test.ts
// ═════════════════════════════════════════════════════════════════════════════
// Executable specification for tax-snapshot-derivations.ts.
// Tests the locked rules from TAX-MERGE-PLAN.md v3 §3.
// Run via tsx. Must pass before Snapshot UI ships.
// ═════════════════════════════════════════════════════════════════════════════

import {
  deriveReadiness,
  deriveBasisRecovery,
  deriveRecaptureExposure,
  deriveNolPosition,
  deriveKeyMissingInput,
  deriveEvidenceGap,
  deriveTaxStructureEvaluated,
  buildTaxComparisonRows,
  buildTaxSnapshot,
  buildTaxFactsView,
  buildTaxImplicationsView,
} from "./tax-snapshot-derivations";
import { buildStructuralComparisonPanel } from "./structural-comparison";
import { buildTaxStructureSection } from "@/lib/acquiflow/tax-structure-section";
import type { TaxAssumptionRecord, BasisByClass } from "@/components/TaxAssumptionsTab";
import type { DealTaxAssumptionsRow } from "@/lib/intelligence/tax/tax-row-to-engine-input";

// ── runner ──
let pass = 0, fail = 0;
const errors: string[] = [];
const T = (name: string, fn: () => void) => {
  try { fn(); pass++; console.log("  ✓ " + name); }
  catch (e) { fail++; const msg = (e as Error).message; errors.push(`${name}: ${msg}`); console.log("  ✗ " + name + "\n      " + msg); }
};
const A = (cond: boolean, msg: string) => { if (!cond) throw new Error(msg); };
const AE = <T>(actual: T, expected: T, label: string) => {
  if (actual !== expected) throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
};

// ── fixtures: progressively filled records ──
const emptyBasis: BasisByClass = {
  goodwill: null, equipment: null, real_property: null, intangibles: null, working_capital: null,
};
const seed = (): TaxAssumptionRecord => ({
  deal_id: "test", ppa_structure: "unspecified", entity_type: "unknown",
  nols_disclosed: "unknown", nol_amount: null,
  seller_basis_disclosed: "unknown", existing_basis_by_class: { ...emptyBasis },
  prior_depreciation_disclosed: "unknown", asset_accum_depreciation: null,
  recapture_sensitive_present: "unknown",
  ppa_goodwill: null, ppa_equipment: null, ppa_real_property: null,
  ppa_intangibles: null, ppa_working_capital: null,
  asset_equipment_class: "unspecified", asset_real_property_class: "unspecified",
  debt_seller_note_principal: null, debt_seller_note_rate: null, debt_seller_note_term: null,
  buyer_ordinary_rate: null, buyer_capital_rate: null,
  seller_ordinary_rate: null, seller_capital_rate: null,
  state_footprint: [],
});

// adapter from record → DealTaxAssumptionsRow (the shape buildTaxStructureSection consumes).
// Mirrors recordToRow but with mechanical recapture derivation (Decision #1).
function toRow(rec: TaxAssumptionRecord): DealTaxAssumptionsRow {
  return {
    deal_id: rec.deal_id ?? "test",
    ppa_structure: rec.ppa_structure as DealTaxAssumptionsRow["ppa_structure"],
    entity_type: rec.entity_type as DealTaxAssumptionsRow["entity_type"],
    seller_basis_disclosed: rec.seller_basis_disclosed,
    existing_basis_goodwill: rec.existing_basis_by_class.goodwill,
    existing_basis_equipment: rec.existing_basis_by_class.equipment,
    existing_basis_real_property: rec.existing_basis_by_class.real_property,
    existing_basis_intangibles: rec.existing_basis_by_class.intangibles,
    existing_basis_working_capital: rec.existing_basis_by_class.working_capital,
    prior_depreciation_disclosed: rec.prior_depreciation_disclosed,
    asset_accum_depreciation: rec.asset_accum_depreciation,
    // Mechanical derivation per Decision #1 — mirrors the production adapter.
    recapture_sensitive_present: ((rec.ppa_equipment ?? 0) > 0 || (rec.ppa_real_property ?? 0) > 0)
      ? "yes" : "no",
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

// progressive fixtures
const empty = seed();
const withStructure: TaxAssumptionRecord = { ...empty, ppa_structure: "asset" };
const withEntity: TaxAssumptionRecord = { ...withStructure, entity_type: "s_corp" };
const withPpa: TaxAssumptionRecord = { ...withEntity, ppa_goodwill: 1_000_000 };
const withPpaEquip: TaxAssumptionRecord = { ...withPpa, ppa_equipment: 600_000 };
const withClasses: TaxAssumptionRecord = { ...withPpaEquip, asset_equipment_class: "7yr" };
const withBasis: TaxAssumptionRecord = {
  ...withClasses,
  seller_basis_disclosed: "yes",
  existing_basis_by_class: { goodwill: 250_000, equipment: 60_000, real_property: null, intangibles: null, working_capital: null },
};
const withNol: TaxAssumptionRecord = { ...withBasis, nols_disclosed: "no" };
const fullySubstantiated = withNol; // 6/6 readiness, no evidence gaps

// =============================================================================
// SECTION 1: STRUCTURE READINESS (9 tests — 8 progression + planning-rates)
// =============================================================================
console.log("\n── Structure Readiness ──");

T("0/6 when no inputs exist", () => {
  AE(deriveReadiness(empty).ready, 0, "ready");
  AE(deriveReadiness(empty).total, 6, "total");
});
T("1/6 after structure only", () => {
  AE(deriveReadiness(withStructure).ready, 1, "ready");
});
T("2/6 after structure + entity", () => {
  AE(deriveReadiness(withEntity).ready, 2, "ready");
});
T("3/6 after PPA allocation entered", () => {
  AE(deriveReadiness(withPpa).ready, 3, "ready");
});
T("4/6 after recovery classes specified", () => {
  AE(deriveReadiness(withClasses).ready, 4, "ready");
});
T("5/6 after seller basis disclosure", () => {
  AE(deriveReadiness(withBasis).ready, 5, "ready");
});
T("6/6 after NOL disclosure", () => {
  AE(deriveReadiness(withNol).ready, 6, "ready");
});
T("readiness never counts planning rates", () => {
  // adding rates to any fixture must not change ready count
  const ratesOnEmpty = { ...empty, buyer_ordinary_rate: 0.37, buyer_capital_rate: 0.20, seller_ordinary_rate: 0.37, seller_capital_rate: 0.20 };
  AE(deriveReadiness(ratesOnEmpty).ready, 0, "rates alone");
  const ratesOnFull = { ...withNol, buyer_ordinary_rate: 0.37 };
  AE(deriveReadiness(ratesOnFull).ready, 6, "rates on top of 6/6");
});
T("readiness total is always 6 (literal)", () => {
  AE(deriveReadiness(empty).total, 6, "empty total");
  AE(deriveReadiness(withNol).total, 6, "full total");
});

// =============================================================================
// SECTION 2: KEY MISSING INPUT (7 tests — strict priority overrides + clear)
// =============================================================================
console.log("\n── Key Missing Input ──");

T("Structure missing overrides everything", () => {
  AE(deriveKeyMissingInput(deriveReadiness(empty)),
     "Transaction structure not specified.", "priority 1");
});
T("PPA missing overrides entity/basis/NOL gaps", () => {
  // structure set; entity/PPA/basis/NOL all unset → PPA wins (priority 2)
  const r = { ...empty, ppa_structure: "asset" as const };
  AE(deriveKeyMissingInput(deriveReadiness(r)),
     "Purchase-price allocation not entered.", "priority 2");
});
T("Recovery class missing overrides entity/basis/NOL gaps", () => {
  // PPA equipment entered, no class → category 3 (classes) unmet
  const r = { ...empty, ppa_structure: "asset" as const, ppa_equipment: 600_000 };
  const msg = deriveKeyMissingInput(deriveReadiness(r));
  A(msg.startsWith("Recovery class missing"), `expected "Recovery class missing…", got: ${msg}`);
});
T("Entity missing overrides basis/NOL gaps", () => {
  // structure + PPA + classes met; entity unset → entity wins (priority 4)
  const r = { ...empty, ppa_structure: "asset" as const, ppa_goodwill: 1_000_000 };
  AE(deriveKeyMissingInput(deriveReadiness(r)),
     "Target entity type not specified.", "priority 4");
});
T("Basis disclosure missing overrides NOL gap", () => {
  // 1-4 met, basis and NOL unset → basis wins (priority 5)
  AE(deriveKeyMissingInput(deriveReadiness(withClasses)),
     "Seller basis disclosure not provided.", "priority 5");
});
T("NOL missing is the last priority", () => {
  AE(deriveKeyMissingInput(deriveReadiness(withBasis)),
     "NOL disclosure not provided.", "priority 6");
});
T("All complete returns '—'", () => {
  AE(deriveKeyMissingInput(deriveReadiness(withNol)), "—", "all met");
});

// =============================================================================
// SECTION 3: EVIDENCE GAP (8 tests — suppression + 5 cases + priority + clear)
// =============================================================================
console.log("\n── Evidence Gap ──");

T("Suppressed ('—') while KMI on structure (category 1)", () => {
  AE(deriveEvidenceGap(empty, deriveReadiness(empty)), "—", "no structure");
});
T("Suppressed ('—') while KMI on PPA (category 2)", () => {
  AE(deriveEvidenceGap(withStructure, deriveReadiness(withStructure)), "—", "no PPA");
});
T("Suppressed ('—') while KMI on classes (category 3)", () => {
  // PPA equipment entered, no class
  const r = { ...empty, ppa_structure: "asset" as const, entity_type: "s_corp" as const, ppa_equipment: 600_000 };
  AE(deriveEvidenceGap(r, deriveReadiness(r)), "—", "no class");
});
T("Basis-by-class request fires when basis=yes but per-class empty", () => {
  // readiness ≥4 (no class block); basis disclosed yes with empty per-class object
  const r: TaxAssumptionRecord = {
    ...withClasses,
    seller_basis_disclosed: "yes",
    existing_basis_by_class: { ...emptyBasis },
  };
  const msg = deriveEvidenceGap(r, deriveReadiness(r));
  A(msg.includes("basis-by-class breakdown"), `expected basis-by-class request, got: ${msg}`);
});
T("Prior depreciation request fires when disclosed=yes but no amount", () => {
  const r: TaxAssumptionRecord = {
    ...withClasses, prior_depreciation_disclosed: "yes", asset_accum_depreciation: null,
  };
  const msg = deriveEvidenceGap(r, deriveReadiness(r));
  A(msg.includes("depreciation schedule"), `expected depreciation request, got: ${msg}`);
});
T("NOL schedule request fires when NOL=yes but no amount", () => {
  const r: TaxAssumptionRecord = {
    ...withClasses, nols_disclosed: "yes", nol_amount: null,
  };
  const msg = deriveEvidenceGap(r, deriveReadiness(r));
  A(msg.includes("NOL carryforward schedule"), `expected NOL request, got: ${msg}`);
});
T("Seller note terms request fires when principal set but rate/term missing", () => {
  const r: TaxAssumptionRecord = {
    ...withClasses, debt_seller_note_principal: 480_000,
    debt_seller_note_rate: null, debt_seller_note_term: null,
  };
  const msg = deriveEvidenceGap(r, deriveReadiness(r));
  A(msg.includes("Seller note principal entered"), `expected seller-note request, got: ${msg}`);
});
T("Basis substantiation request fires: full PPA, structure asset, basis not 'yes'", () => {
  // basis disclosed "no" (or "unknown"); full PPA entered
  const r: TaxAssumptionRecord = { ...withClasses, seller_basis_disclosed: "no" };
  const msg = deriveEvidenceGap(r, deriveReadiness(r));
  A(msg.includes("§1245 upper bound") || msg.includes("basis substantiation"),
    `expected basis-substantiation request, got: ${msg}`);
});
T("Evidence Gap priority: case 1 (basis-by-class) beats case 3 (NOL)", () => {
  // both apply; #1 must win
  const r: TaxAssumptionRecord = {
    ...withClasses,
    seller_basis_disclosed: "yes", existing_basis_by_class: { ...emptyBasis },
    nols_disclosed: "yes", nol_amount: null,
  };
  const msg = deriveEvidenceGap(r, deriveReadiness(r));
  A(msg.includes("basis-by-class breakdown"), `priority should pick #1; got: ${msg}`);
});
T("Fully substantiated returns '—'", () => {
  AE(deriveEvidenceGap(fullySubstantiated, deriveReadiness(fullySubstantiated)), "—", "all good");
});

// =============================================================================
// SECTION 4: BASIS RECOVERY (4 boundary tests)
// =============================================================================
console.log("\n── Basis Recovery ──");

T("Not yet computable when no PPA allocated", () => {
  const section = buildTaxStructureSection(toRow(withEntity));
  AE(deriveBasisRecovery(withEntity, section), "Not yet computable", "no PPA");
});
T("Inputs Started when PPA entered but structure unspecified", () => {
  // goodwill entered but structure unspecified → engine won't fire §197 yet
  const r: TaxAssumptionRecord = { ...empty, ppa_goodwill: 1_000_000 };
  const section = buildTaxStructureSection(toRow(r));
  AE(deriveBasisRecovery(r, section), "Inputs Started", "inputs started");
});
T("Partial when one schedule computed, one allocated class did not", () => {
  // asset + goodwill ($1M, §197 computes) + equipment ($600K) with NO class (MACRS not_computable)
  const section = buildTaxStructureSection(toRow(withPpaEquip));
  AE(deriveBasisRecovery(withPpaEquip, section), "Partial", "partial");
});
T("Complete when every allocated class has a computed schedule", () => {
  // asset + goodwill ($1M, §197) + equipment ($600K) + 7yr class (MACRS) → both compute
  const section = buildTaxStructureSection(toRow(withClasses));
  AE(deriveBasisRecovery(withClasses, section), "Complete", "complete");
});

// =============================================================================
// SECTION 5: STRUCTURAL COMPARISON (5 visibility/emphasis tests)
// =============================================================================
console.log("\n── Structural Comparison ──");

T("Asset selection produces 2-column comparison (asset primary)", () => {
  const section = buildTaxStructureSection(toRow(withClasses));
  const rows = buildTaxComparisonRows(withClasses, section);
  const plan = buildStructuralComparisonPanel(withClasses, rows);
  A(plan.visible, "panel visible");
  A(plan.columns.find(c => c.structure === "asset")?.emphasis === "primary", "asset primary");
  A(plan.columns.find(c => c.structure === "stock")?.emphasis === "secondary", "stock secondary");
});
T("Stock selection produces 2-column comparison (stock primary)", () => {
  const r: TaxAssumptionRecord = { ...withClasses, ppa_structure: "stock" };
  const section = buildTaxStructureSection(toRow(r));
  const plan = buildStructuralComparisonPanel(r, buildTaxComparisonRows(r, section));
  A(plan.columns.find(c => c.structure === "stock")?.emphasis === "primary", "stock primary");
  A(plan.columns.find(c => c.structure === "asset")?.emphasis === "secondary", "asset secondary");
});
T("§338(h)(10) selection: elected column primary; baseline muted", () => {
  const r: TaxAssumptionRecord = { ...withClasses, ppa_structure: "stock_with_338_h_10" };
  const section = buildTaxStructureSection(toRow(r));
  const plan = buildStructuralComparisonPanel(r, buildTaxComparisonRows(r, section));
  A(plan.columns.find(c => c.structure === "stock_with_338_h_10")?.emphasis === "primary", "338 primary");
  A(plan.columns.some(c => c.emphasis === "muted"), "baseline muted present");
});
T("§336(e) selection: elected column primary; baseline muted", () => {
  const r: TaxAssumptionRecord = { ...withClasses, ppa_structure: "stock_with_336_e" };
  const section = buildTaxStructureSection(toRow(r));
  const plan = buildStructuralComparisonPanel(r, buildTaxComparisonRows(r, section));
  A(plan.columns.find(c => c.structure === "stock_with_336_e")?.emphasis === "primary", "336 primary");
  A(plan.columns.some(c => c.emphasis === "muted"), "baseline muted present");
});
T("Unspecified structure: comparison shows in incomplete state (no primary)", () => {
  const section = buildTaxStructureSection(toRow(empty));
  const plan = buildStructuralComparisonPanel(empty, buildTaxComparisonRows(empty, section));
  A(plan.visible, "panel visible");
  A(plan.columns.every(c => c.emphasis !== "primary"), "no primary");
  A(plan.columns.every(c => !c.computable_now), "nothing computable now");
});
T("Transferability dimension row is type-reserved but hidden in v1", () => {
  const section = buildTaxStructureSection(toRow(withClasses));
  const rows = buildTaxComparisonRows(withClasses, section);
  const transfer = rows.find(r => r.dimension === "transferability_considerations");
  A(!!transfer, "transferability row present in type");
  A(transfer!.visible === false, "transferability row hidden in v1");
});

// =============================================================================
// SECTION 6: TAX STRUCTURE EVALUATED (6 milestone tests, including schedule floor)
// =============================================================================
console.log("\n── Tax Structure Evaluated ──");

const evalFor = (rec: TaxAssumptionRecord) => {
  const section = buildTaxStructureSection(toRow(rec));
  const readiness = deriveReadiness(rec);
  const kmi = deriveKeyMissingInput(readiness);
  const gap = deriveEvidenceGap(rec, readiness);
  return deriveTaxStructureEvaluated(rec, section, readiness, kmi, gap);
};

T("Not Started when no meaningful tax inputs entered", () => {
  AE(evalFor(empty), "Not Started", "empty");
});
T("Preliminary when only structure or entity entered", () => {
  AE(evalFor(withStructure), "Preliminary", "structure only");
  AE(evalFor(withEntity), "Preliminary", "structure+entity");
});
T("Evaluated stuck at Preliminary: PPA entered but structure unspecified (no schedules fire)", () => {
  const r: TaxAssumptionRecord = { ...empty, ppa_goodwill: 1_000_000 };
  AE(evalFor(r), "Preliminary", "PPA without structure → no schedule");
});
T("Evaluated reaches Substantially when structure+entity+PPA + ≥1 schedule", () => {
  // withPpa: asset + s_corp + goodwill $1M → §197 fires
  AE(evalFor(withPpa), "Substantially Evaluated", "with PPA");
});
T("Evaluated stuck at Substantially when readiness 6/6 but section.schedules.length < 1", () => {
  // This case is hard to construct: at 6/6 readiness, PPA is entered (category 3 met),
  // so at least one schedule will fire unless ppa_structure is unspecified — but that
  // would block category 1. So this state is technically unreachable through normal flow.
  // The test asserts the floor IS enforced even in a synthetic case where PPA is entered
  // only as working_capital (which produces no schedule).
  const r: TaxAssumptionRecord = {
    ...withNol,
    ppa_goodwill: null, ppa_equipment: null, ppa_real_property: null, ppa_intangibles: null,
    ppa_working_capital: 100_000, // only WC — no recovery schedule
    asset_equipment_class: "unspecified", asset_real_property_class: "unspecified",
  };
  // readiness still 6/6 (categories 4 vacuously true: no equipment/RP to class)
  const result = evalFor(r);
  A(result !== "Fully Evaluated", `floor should block Fully Evaluated when no schedules; got: ${result}`);
});
T("Evaluated reaches Fully when readiness 6/6 + KMI '—' + Evidence Gap '—' + schedules ≥1", () => {
  AE(evalFor(fullySubstantiated), "Fully Evaluated", "fully substantiated");
});

// =============================================================================
// SECTION 7: NOL POSITION (3 tests)
// =============================================================================
console.log("\n── NOL Position ──");

T("Disclosed when nols_disclosed='yes'", () => {
  AE(deriveNolPosition({ ...empty, nols_disclosed: "yes" }), "Disclosed", "yes");
});
T("Not disclosed when nols_disclosed='no'", () => {
  AE(deriveNolPosition({ ...empty, nols_disclosed: "no" }), "Not disclosed", "no");
});
T("Not yet evaluated when nols_disclosed='unknown'", () => {
  AE(deriveNolPosition(empty), "Not yet evaluated", "unknown");
});

// =============================================================================
// SECTION 8: RECAPTURE EXPOSURE (4 boundary tests)
// =============================================================================
console.log("\n── Recapture Exposure ──");

T("Not yet computable when no equipment/RP allocation", () => {
  const section = buildTaxStructureSection(toRow(withEntity));
  AE(deriveRecaptureExposure(withEntity, section), "Not yet computable", "no allocation");
});
T("Flagged, undisclosed when allocation present but prior depreciation not 'yes'", () => {
  // withClasses has equipment + class but prior_depreciation_disclosed = "unknown"
  const section = buildTaxStructureSection(toRow(withClasses));
  AE(deriveRecaptureExposure(withClasses, section), "Flagged, undisclosed", "flagged");
});
T("Identified when statement fired AND prior depreciation disclosed with amount", () => {
  const r: TaxAssumptionRecord = {
    ...withClasses, prior_depreciation_disclosed: "yes", asset_accum_depreciation: 90_000,
  };
  const section = buildTaxStructureSection(toRow(r));
  AE(deriveRecaptureExposure(r, section), "Identified", "identified");
});

// =============================================================================
// SECTION 9: FACTS / IMPLICATIONS VIEW BUILDERS (3 tests)
// =============================================================================
console.log("\n── Facts / Implications view builders ──");


T("buildTaxFactsView smoke: returns one line per entered fact, with seam tags", () => {
  const view = buildTaxFactsView(fullySubstantiated);
  A(Array.isArray(view.lines) && view.lines.length > 0, "lines present");
  // every line has the required shape
  view.lines.forEach((ln, i) => {
    A(typeof ln.label === "string" && ln.label.length > 0, `line ${i} has label`);
    A(typeof ln.value === "string" && ln.value.length > 0, `line ${i} has value`);
    A(ln.seam === "fact" || ln.seam === "assumption", `line ${i} has seam`);
  });
  // structure choice surfaces as one of the lines (sanity check)
  const hasStructure = view.lines.some(ln => ln.value === "Asset purchase");
  A(hasStructure, "structure choice surfaces in Facts");
});

T("buildTaxImplicationsView: schedules present when goodwill is allocated", () => {
  const section = buildTaxStructureSection(toRow(fullySubstantiated));
  const view = buildTaxImplicationsView(section);
  A(view.schedules.length >= 1, "at least one schedule rendered");
  const sec197 = view.schedules.find(s => s.heading.includes("197"));
  A(!!sec197, "§197 schedule present for $1M goodwill case");
  A(sec197!.total === 1_000_000, `§197 total should be $1M, got ${sec197!.total}`);
  A(sec197!.rows.length > 0 && sec197!.rows[0].label.startsWith("Year"), "year-labeled rows");
});

T("buildTaxImplicationsView: not-computable absent-notes present when inputs missing", () => {
  // PPA equipment entered but no class → MACRS not_computable → absent note must appear
  const section = buildTaxStructureSection(toRow(withPpaEquip));
  const view = buildTaxImplicationsView(section);
  A(view.absent.length > 0, "absent notes present when something cannot compute");
  const equipNote = view.absent.find(n => /equipment/i.test(n) || /MACRS/i.test(n));
  A(!!equipNote, `expected an equipment/MACRS absent note, got: ${JSON.stringify(view.absent)}`);
});

// =============================================================================
// SECTION 10: COMPOSITION (buildTaxSnapshot end-to-end)
// =============================================================================
console.log("\n── buildTaxSnapshot composition ──");

T("Canonical $1M-goodwill / asset / S-corp case produces consistent snapshot", () => {
  const section = buildTaxStructureSection(toRow(fullySubstantiated));
  const snap = buildTaxSnapshot(fullySubstantiated, section);
  AE(snap.structure_label, "Asset purchase", "structure label");
  AE(snap.entity_label, "S-Corporation", "entity label");
  AE(snap.basis_recovery, "Complete", "basis recovery");
  AE(snap.nol_position, "Not disclosed", "nol position");
  AE(snap.readiness.ready, 6, "readiness ready");
  AE(snap.readiness.total, 6, "readiness total");
  AE(snap.evaluated, "Fully Evaluated", "evaluated");
  AE(snap.key_missing_input, "—", "kmi");
  AE(snap.evidence_gap, "—", "evidence gap");
});

// =============================================================================
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log("\n── failed test details ──");
  errors.slice(0, 5).forEach(e => console.log("  " + e));
  if (errors.length > 5) console.log(`  ... and ${errors.length - 5} more`);
  (globalThis as unknown as { process?: { exit?: (n: number) => void } }).process?.exit?.(1);
}
