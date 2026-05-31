// lib/intelligence/tax/tax-consequence-calculator.ts
// ═════════════════════════════════════════════════════════════════════════════
// AcquiFlow — Phase Tax-2 LAYER 3: TAX CONSEQUENCE CALCULATOR (deterministic)
//
// Pure functions. canonical tax facts + scenario assumptions → tax consequences.
// Built byte-for-byte against TAX-CONSEQUENCE-ENGINE-SPEC.md. No model imports,
// no IO, no rate constants, no discounting, no totals/NPV/tax-liability.
//
// Categorical consequences are LOOKUP + SUBSTITUTION against TAX_CATEGORICAL_CATALOG
// (the calculator does not author statement text; it selects a stored variant).
// Arithmetic consequences (§197, MACRS, total recovery, Bucket B shields) compute
// statutory schedules and never apply a rate unless the consequence is Bucket B
// and the rate is an explicitly-supplied input.
//
// Engine invariants enforced: E-1..E-8 (see spec). Same not-computable contract
// as the acquisition engine: null value + exact reason + no formula.
// ═════════════════════════════════════════════════════════════════════════════

import {
  TAX_CATEGORICAL_CATALOG,
  type TaxCanonicalFacts, type TaxScenarioAssumptions, type TaxConsequenceId,
  type TaxConsequenceDomain, type CategoricalStatementSpec,
} from "./tax-types";

// re-export the input types so downstream consumers (tests, renderer, routes)
// import them from the calculator's public surface.
export type { TaxCanonicalFacts, TaxScenarioAssumptions } from "./tax-types";

export const TAX_CALCULATOR_VERSION = "tax-calc-v1.0.0";

// ── output shape: extends the acquisition ComputedConsequence with schedule +
//    statement_text. A given consequence carries exactly one of: schedule
//    (arithmetic), statement_text (categorical), or null (not-computable). ──
export type TaxComputabilityStatus = "computed" | "assumption_bound" | "not_computable";
export type TaxProvenanceSource = "canonical_market_truth" | "scenario_assumption";

export interface TaxInputValueUsed {
  name: string;
  value: number | string | boolean | null;
  source: TaxProvenanceSource;
}

export interface TaxScheduleRow {
  year: number;
  // arithmetic columns vary by consequence; all optional, all numeric
  amount?: number;
  percentage?: number;
  deduction?: number;
  rate?: number;
  shield?: number;
  // total-recovery component columns
  sec197?: number;
  equipment?: number;
  real_property?: number;
  total?: number;
}

export interface TaxConsequence {
  consequence_id: TaxConsequenceId;
  domain: TaxConsequenceDomain;
  subject_id: string;
  label: string;
  bucket: "A" | "B";
  computability_status: TaxComputabilityStatus;
  // arithmetic consequences:
  schedule: TaxScheduleRow[] | null;
  unit: string | null;            // "schedule" | "categorical" | "USD" ...
  // categorical consequences:
  statement_text: string | null;
  // shared:
  not_computable_reason: string | null;
  formula_display: string | null; // for categoricals = statement text (V-6); for arithmetic = derivation note
  input_values_used: TaxInputValueUsed[];
  // structural-inapplicability marker (consequence simply absent, not "not computable")
  emitted: boolean;
}

// ── numeric helpers (pure) ──
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const r0 = (n: number) => Math.round(n);
const usd = (n: number) => "$" + r0(n).toLocaleString("en-US");
const isPos = (v: unknown): v is number => isNum(v) && v > 0;

// ── statutory MACRS percentage tables (constants, not computed) ──
const MACRS_5YR = [0.20, 0.32, 0.192, 0.1152, 0.1152, 0.0576];
const MACRS_7YR = [0.1429, 0.2449, 0.1749, 0.1249, 0.0893, 0.0892, 0.0893, 0.0446];

// ── catalog lookup ──
const CATALOG_BY_ID = new Map<TaxConsequenceId, CategoricalStatementSpec>(
  TAX_CATEGORICAL_CATALOG.map((s) => [s.consequence_id, s]),
);

// helper: build a not-computable consequence
function notComputable(
  id: TaxConsequenceId, domain: TaxConsequenceDomain, subject_id: string, label: string,
  bucket: "A" | "B", reason: string, inputs: TaxInputValueUsed[],
): TaxConsequence {
  return {
    consequence_id: id, domain, subject_id, label, bucket,
    computability_status: "not_computable", schedule: null, unit: null,
    statement_text: null, not_computable_reason: reason, formula_display: null,
    input_values_used: inputs, emitted: true,
  };
}

// helper: a consequence that is structurally inapplicable (not emitted at all)
function notEmitted(
  id: TaxConsequenceId, domain: TaxConsequenceDomain, subject_id: string, label: string, bucket: "A" | "B",
): TaxConsequence {
  return {
    consequence_id: id, domain, subject_id, label, bucket,
    computability_status: "not_computable", schedule: null, unit: null,
    statement_text: null, not_computable_reason: null, formula_display: null,
    input_values_used: [], emitted: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORICAL ENGINE — lookup + substitution. Selects a stored variant by a key
// derived from inputs; never authors text.
// ─────────────────────────────────────────────────────────────────────────────

function pickVariant(spec: CategoricalStatementSpec, key: string): string | null {
  if (typeof spec.emitted_text === "string") return spec.emitted_text;
  return spec.emitted_text[key] ?? null;
}

function provFromSpec(spec: CategoricalStatementSpec, canon: TaxCanonicalFacts, s: TaxScenarioAssumptions): TaxInputValueUsed[] {
  return spec.provenance_fields.map((pf) => {
    let value: number | string | boolean | null = null;
    // resolve the value from canon or scenario by name
    if (pf.source === "canonical_market_truth") value = resolveCanon(canon, pf.name);
    else value = resolveScenario(s, pf.name);
    return { name: pf.name, value, source: pf.source };
  });
}

function resolveCanon(canon: TaxCanonicalFacts, name: string): number | string | boolean | null {
  switch (name) {
    case "target_entity_type": return canon.target_entity_type;
    case "disclosed_nols_present": return canon.disclosed_nols_present;
    case "accelerated_depreciation_present": return canon.accelerated_depreciation_present;
    case "recapture_sensitive_classes_present": return canon.recapture_sensitive_classes_present;
    case "existing_tax_basis_disclosed": return canon.existing_tax_basis_disclosed;
    default: return null;
  }
}
function resolveScenario(s: TaxScenarioAssumptions, name: string): number | string | boolean | null {
  switch (name) {
    case "deal_structure": return s.deal_structure;
    case "ppa_equipment": return s.ppa_equipment;
    case "ppa_real_property": return s.ppa_real_property;
    case "ppa_real_property_class": return s.ppa_real_property_class;
    case "seller_ordinary_rate": return s.seller_ordinary_rate;
    case "seller_capital_rate": return s.seller_capital_rate;
    // seller_note.* resolved by the caller (seller note lives on the acquisition scenario)
    default: return null;
  }
}

// build a categorical consequence from a selected variant
function categorical(
  spec: CategoricalStatementSpec, subject_id: string, label: string,
  text: string, inputs: TaxInputValueUsed[],
): TaxConsequence {
  return {
    consequence_id: spec.consequence_id, domain: spec.domain, subject_id, label,
    bucket: spec.bucket === "C" ? "A" : spec.bucket, // C never occurs; satisfy types
    computability_status: "assumption_bound",
    schedule: null, unit: "categorical",
    statement_text: text,
    not_computable_reason: null,
    formula_display: text, // V-6: formula IS the statement text
    input_values_used: inputs, emitted: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ARITHMETIC BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

// §197 amortization schedule — separate groups for goodwill vs other intangibles
function buildSec197(s: TaxScenarioAssumptions, subject_id: string): TaxConsequence {
  const id: TaxConsequenceId = "tax.sec197_amortization_schedule";
  const dom: TaxConsequenceDomain = "tax_amortization_depreciation";
  const gw = s.ppa_goodwill, oi = s.ppa_other_intangibles;
  const inputs: TaxInputValueUsed[] = [];
  if (isPos(gw)) inputs.push({ name: "ppa_goodwill", value: gw, source: "scenario_assumption" });
  if (isPos(oi)) inputs.push({ name: "ppa_other_intangibles", value: oi, source: "scenario_assumption" });
  if (!isPos(gw) && !isPos(oi)) {
    return notComputable(id, dom, subject_id, "Annual §197 amortization", "A", "no §197 intangible allocation specified",
      [{ name: "ppa_goodwill", value: gw ?? null, source: "scenario_assumption" }]);
  }
  // build 15-year schedule; goodwill + other intangibles summed per year but
  // formula_display names each group. Year 15 absorbs rounding remainder.
  const total197 = (isPos(gw) ? gw : 0) + (isPos(oi) ? oi : 0);
  const perYear = r0(total197 / 15);
  const schedule: TaxScheduleRow[] = [];
  for (let y = 1; y <= 15; y++) {
    const amount = y < 15 ? perYear : total197 - perYear * 14;
    schedule.push({ year: y, amount });
  }
  const parts: string[] = [];
  if (isPos(gw)) parts.push(`goodwill ${usd(gw)} ÷ 15`);
  if (isPos(oi)) parts.push(`other intangibles ${usd(oi)} ÷ 15`);
  const formula = `${parts.join("; ")} (straight-line §197) = ${usd(perYear)}/yr for 15 years; year 15 absorbs rounding remainder`;
  return {
    consequence_id: id, domain: dom, subject_id, label: "Annual §197 amortization", bucket: "A",
    computability_status: "assumption_bound", schedule, unit: "schedule",
    statement_text: null, not_computable_reason: null, formula_display: formula,
    input_values_used: inputs, emitted: true,
  };
}

// MACRS equipment schedule
function buildMacrsEquipment(s: TaxScenarioAssumptions, subject_id: string): TaxConsequence {
  const id: TaxConsequenceId = "tax.macrs_recovery_schedule_equipment";
  const dom: TaxConsequenceDomain = "tax_amortization_depreciation";
  const eq = s.ppa_equipment, cls = s.ppa_equipment_class;
  const inputs: TaxInputValueUsed[] = [
    { name: "ppa_equipment", value: eq ?? null, source: "scenario_assumption" },
    { name: "ppa_equipment_class", value: cls, source: "scenario_assumption" },
  ];
  if (!isPos(eq)) return notComputable(id, dom, subject_id, "MACRS recovery — equipment", "A", "no equipment allocation specified", inputs);
  if (cls === "unspecified") return notComputable(id, dom, subject_id, "MACRS recovery — equipment", "A", "equipment MACRS class not specified", inputs);
  const table = cls === "5yr" ? MACRS_5YR : MACRS_7YR;
  const schedule: TaxScheduleRow[] = [];
  let allocated = 0;
  table.forEach((p, i) => {
    const isLast = i === table.length - 1;
    const amount = isLast ? eq - allocated : r0(eq * p);
    allocated += amount;
    schedule.push({ year: i + 1, percentage: p, amount });
  });
  const clsLabel = cls === "5yr" ? "5-year" : "7-year";
  const formula = `MACRS ${clsLabel} property, 200% declining balance, half-year convention. Recovery percentages are statutory. Final row absorbs rounding remainder so the schedule sums to ${usd(eq)}.`;
  return {
    consequence_id: id, domain: dom, subject_id, label: "MACRS recovery — equipment", bucket: "A",
    computability_status: "assumption_bound", schedule, unit: "schedule",
    statement_text: null, not_computable_reason: null, formula_display: formula,
    input_values_used: inputs, emitted: true,
  };
}

// MACRS real property schedule (level annual; year 1/final prorate out of scope)
function buildMacrsRealProperty(s: TaxScenarioAssumptions, subject_id: string): TaxConsequence {
  const id: TaxConsequenceId = "tax.macrs_recovery_schedule_real_property";
  const dom: TaxConsequenceDomain = "tax_amortization_depreciation";
  const rp = s.ppa_real_property, cls = s.ppa_real_property_class;
  const inputs: TaxInputValueUsed[] = [
    { name: "ppa_real_property", value: rp ?? null, source: "scenario_assumption" },
    { name: "ppa_real_property_class", value: cls, source: "scenario_assumption" },
  ];
  if (!isPos(rp)) return notComputable(id, dom, subject_id, "MACRS recovery — real property", "A", "no real property allocation specified", inputs);
  if (cls === "unspecified") return notComputable(id, dom, subject_id, "MACRS recovery — real property", "A", "real property recovery class not specified", inputs);
  const years = cls === "nonresidential_39yr" ? 39 : 27.5;
  const level = rp / years;
  const wholeYears = Math.floor(years);
  const schedule: TaxScheduleRow[] = [];
  for (let y = 1; y <= wholeYears; y++) schedule.push({ year: y, amount: r0(level) });
  const clsLabel = cls === "nonresidential_39yr" ? "Nonresidential 39-year" : "Residential 27.5-year";
  const formula = `${clsLabel} real property, straight-line, mid-month convention. ${usd(rp)} ÷ ${years} = ${usd(level)} per full year. First and final year amounts depend on the placed-in-service month, which is not in scope for MVP.`;
  return {
    consequence_id: id, domain: dom, subject_id, label: "MACRS recovery — real property", bucket: "A",
    computability_status: "assumption_bound", schedule, unit: "schedule",
    statement_text: null, not_computable_reason: null, formula_display: formula,
    input_values_used: inputs, emitted: true,
  };
}

// total basis recovery — aggregate of computable component schedules. 3 refusals.
function buildTotalRecovery(
  s: TaxScenarioAssumptions, subject_id: string,
  sec197: TaxConsequence, equip: TaxConsequence, realprop: TaxConsequence,
): TaxConsequence {
  const id: TaxConsequenceId = "tax.total_basis_recovery_schedule";
  const dom: TaxConsequenceDomain = "tax_amortization_depreciation";
  const components: { c: TaxConsequence; key: "sec197" | "equipment" | "real_property" }[] = [
    { c: sec197, key: "sec197" }, { c: equip, key: "equipment" }, { c: realprop, key: "real_property" },
  ];
  const computable = components.filter((x) => x.c.computability_status !== "not_computable" && x.c.schedule);
  if (computable.length === 0) {
    return notComputable(id, dom, subject_id, "Total statutory recovery by year", "A", "no depreciable or amortizable allocation specified", []);
  }
  const maxYear = Math.max(...computable.map((x) => x.c.schedule!.length));
  const schedule: TaxScheduleRow[] = [];
  for (let y = 1; y <= maxYear; y++) {
    const row: TaxScheduleRow = { year: y, sec197: 0, equipment: 0, real_property: 0, total: 0 };
    for (const { c, key } of computable) {
      const r = c.schedule!.find((rr) => rr.year === y);
      const amt = r?.amount ?? 0;
      (row[key] as number) = amt;
      row.total = (row.total ?? 0) + amt;
    }
    schedule.push(row);
  }
  // provenance: union of component allocation inputs + which components included
  const inputs: TaxInputValueUsed[] = [];
  for (const { c, key } of computable) {
    inputs.push({ name: `included.${key}`, value: "true", source: "scenario_assumption" });
    for (const iv of c.input_values_used) inputs.push(iv);
  }
  const formula = "Total statutory recovery by year, summing §197 amortization and §168 (MACRS) depreciation across allocated classes. Amounts are deductions, not tax savings. No rate is applied and no figure is discounted. This schedule reports the timing and amount of statutory deductions. It does not compute tax savings, present value, or tax liability.";
  return {
    consequence_id: id, domain: dom, subject_id, label: "Total statutory recovery by year", bucket: "A",
    computability_status: "assumption_bound", schedule, unit: "schedule",
    statement_text: null, not_computable_reason: null, formula_display: formula,
    input_values_used: inputs, emitted: true,
  };
}

// Bucket B: §197 tax shield (per-year deduction × supplied buyer ordinary rate)
function buildSec197Shield(s: TaxScenarioAssumptions, subject_id: string, sec197: TaxConsequence): TaxConsequence {
  const id: TaxConsequenceId = "tax.annual_197_tax_shield";
  const dom: TaxConsequenceDomain = "tax_amortization_depreciation";
  const rate = s.buyer_ordinary_rate;
  const inputs: TaxInputValueUsed[] = [
    ...sec197.input_values_used,
    { name: "buyer_ordinary_rate", value: rate ?? null, source: "scenario_assumption" },
  ];
  if (sec197.computability_status === "not_computable" || !sec197.schedule) {
    return notComputable(id, dom, subject_id, "Annual §197 tax shield", "B", "no §197 intangible allocation specified", inputs);
  }
  if (!isNum(rate)) return notComputable(id, dom, subject_id, "Annual §197 tax shield", "B", "buyer ordinary rate not provided", inputs);
  const schedule: TaxScheduleRow[] = sec197.schedule.map((r) => ({
    year: r.year, deduction: r.amount, rate, shield: r0((r.amount ?? 0) * rate),
  }));
  const formula = `annual §197 amortization × buyer ordinary rate ${(rate * 100).toFixed(2)}% = annual tax shield (years 1–15). This is an annual tax-shield figure at the supplied rate. It is not discounted and not summed into a present value.`;
  return {
    consequence_id: id, domain: dom, subject_id, label: "Annual §197 tax shield", bucket: "B",
    computability_status: "assumption_bound", schedule, unit: "schedule",
    statement_text: null, not_computable_reason: null, formula_display: formula,
    input_values_used: inputs, emitted: true,
  };
}

// Bucket B: MACRS equipment tax shield
function buildMacrsEquipShield(s: TaxScenarioAssumptions, subject_id: string, equip: TaxConsequence): TaxConsequence {
  const id: TaxConsequenceId = "tax.annual_macrs_tax_shield_equipment";
  const dom: TaxConsequenceDomain = "tax_amortization_depreciation";
  const rate = s.buyer_ordinary_rate;
  const inputs: TaxInputValueUsed[] = [
    ...equip.input_values_used,
    { name: "buyer_ordinary_rate", value: rate ?? null, source: "scenario_assumption" },
  ];
  if (equip.computability_status === "not_computable" || !equip.schedule) {
    const reason = equip.not_computable_reason ?? "equipment schedule not computable";
    return notComputable(id, dom, subject_id, "Annual MACRS tax shield — equipment", "B", reason, inputs);
  }
  if (!isNum(rate)) return notComputable(id, dom, subject_id, "Annual MACRS tax shield — equipment", "B", "buyer ordinary rate not provided", inputs);
  const schedule: TaxScheduleRow[] = equip.schedule.map((r) => ({
    year: r.year, deduction: r.amount, rate, shield: r0((r.amount ?? 0) * rate),
  }));
  const formula = `MACRS equipment deduction × buyer ordinary rate ${(rate * 100).toFixed(2)}% = annual tax shield. Annual tax shield at the supplied rate; not discounted, not summed.`;
  return {
    consequence_id: id, domain: dom, subject_id, label: "Annual MACRS tax shield — equipment", bucket: "B",
    computability_status: "assumption_bound", schedule, unit: "schedule",
    statement_text: null, not_computable_reason: null, formula_display: formula,
    input_values_used: inputs, emitted: true,
  };
}

// Bucket B categorical: seller character split (NO arithmetic, NO totals)
function buildSellerCharacterSplit(s: TaxScenarioAssumptions, subject_id: string): TaxConsequence {
  const id: TaxConsequenceId = "tax.seller_character_split_categorical";
  const spec = CATALOG_BY_ID.get(id)!;
  const inputs: TaxInputValueUsed[] = [
    { name: "seller_ordinary_rate", value: s.seller_ordinary_rate ?? null, source: "scenario_assumption" },
    { name: "seller_capital_rate", value: s.seller_capital_rate ?? null, source: "scenario_assumption" },
  ];
  if (!isNum(s.seller_ordinary_rate)) return notComputable(id, spec.domain, subject_id, "Seller character split", "B", "seller ordinary rate not provided", inputs);
  if (!isNum(s.seller_capital_rate)) return notComputable(id, spec.domain, subject_id, "Seller character split", "B", "seller capital rate not provided", inputs);
  const ppaPresent = isPos(s.ppa_goodwill) || isPos(s.ppa_equipment) || isPos(s.ppa_real_property) || isPos(s.ppa_other_intangibles) || isPos(s.ppa_working_capital);
  if (!ppaPresent) return notComputable(id, spec.domain, subject_id, "Seller character split", "B", "no scenario purchase-price allocation to characterize", inputs);
  // assemble per-class character lines (categorical, NO multiplication)
  const lines: string[] = [];
  if (isPos(s.ppa_goodwill)) lines.push(`Goodwill (capital-rate): scenario allocation ${usd(s.ppa_goodwill)}`);
  if (isPos(s.ppa_equipment)) { lines.push(`Equipment subject to §1245 (ordinary-rate to the extent of prior depreciation; capital-rate above that): scenario allocation ${usd(s.ppa_equipment)}`); inputs.push({ name: "ppa_equipment", value: s.ppa_equipment, source: "scenario_assumption" }); }
  if (isPos(s.ppa_real_property)) { lines.push(`Real property (capital-rate, with §1250 components possible): scenario allocation ${usd(s.ppa_real_property)}`); inputs.push({ name: "ppa_real_property", value: s.ppa_real_property, source: "scenario_assumption" }); }
  if (isPos(s.ppa_other_intangibles)) { lines.push(`Other intangibles (capital-rate): scenario allocation ${usd(s.ppa_other_intangibles)}`); inputs.push({ name: "ppa_other_intangibles", value: s.ppa_other_intangibles, source: "scenario_assumption" }); }
  if (isPos(s.ppa_working_capital)) { lines.push(`Working capital (ordinary-rate, generally): scenario allocation ${usd(s.ppa_working_capital)}`); inputs.push({ name: "ppa_working_capital", value: s.ppa_working_capital, source: "scenario_assumption" }); }
  if (isPos(s.ppa_goodwill)) inputs.push({ name: "ppa_goodwill", value: s.ppa_goodwill, source: "scenario_assumption" });
  const trailer = spec.emitted_text as string; // the locked boundary text
  const rateContext = `Rates supplied: seller ordinary ${(s.seller_ordinary_rate * 100).toFixed(2)}%, seller capital ${(s.seller_capital_rate * 100).toFixed(2)}%.`;
  const text = `Character of seller gain by allocated class (categorical):\n${lines.join("\n")}\n\n${rateContext} ${trailer}`;
  return categorical(spec, subject_id, "Seller character split", text, inputs);
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORICAL CONSEQUENCE BUILDERS (lookup + substitution)
// ─────────────────────────────────────────────────────────────────────────────

function buildStructuralDifference(canon: TaxCanonicalFacts, s: TaxScenarioAssumptions, subject_id: string): TaxConsequence {
  const id: TaxConsequenceId = "tax.structural_difference_asset_vs_stock";
  const spec = CATALOG_BY_ID.get(id)!;
  if (s.deal_structure === "unspecified") return notComputable(id, spec.domain, subject_id, "Structural difference: asset vs stock", "A", spec.not_computable_reasons.deal_structure_unspecified, provFromSpec(spec, canon, s));
  if (canon.target_entity_type === "unknown") return notComputable(id, spec.domain, subject_id, "Structural difference: asset vs stock", "A", spec.not_computable_reasons.target_entity_type_unknown, provFromSpec(spec, canon, s));
  const text = pickVariant(spec, s.deal_structure);
  if (!text) return notComputable(id, spec.domain, subject_id, "Structural difference: asset vs stock", "A", spec.not_computable_reasons.deal_structure_unspecified, provFromSpec(spec, canon, s));
  return categorical(spec, subject_id, "Structural difference: asset vs stock", text, provFromSpec(spec, canon, s));
}

function buildElection(id: TaxConsequenceId, label: string, applicableStructures: string[], canon: TaxCanonicalFacts, s: TaxScenarioAssumptions, subject_id: string): TaxConsequence {
  const spec = CATALOG_BY_ID.get(id)!;
  // non-emission: asset deal, or entity type that can't elect
  if (s.deal_structure === "unspecified") return notComputable(id, spec.domain, subject_id, label, "A", spec.not_computable_reasons.deal_structure_unspecified, provFromSpec(spec, canon, s));
  if (canon.target_entity_type === "unknown") return notComputable(id, spec.domain, subject_id, label, "A", spec.not_computable_reasons.target_entity_type_unknown, provFromSpec(spec, canon, s));
  if (!applicableStructures.includes(s.deal_structure)) return notEmitted(id, spec.domain, subject_id, label, "A");
  if (canon.target_entity_type !== "s_corp" && canon.target_entity_type !== "c_corp") return notEmitted(id, spec.domain, subject_id, label, "A");
  const text = pickVariant(spec, s.deal_structure);
  if (!text) return notEmitted(id, spec.domain, subject_id, label, "A");
  return categorical(spec, subject_id, label, text, provFromSpec(spec, canon, s));
}

function buildNolCarryover(canon: TaxCanonicalFacts, s: TaxScenarioAssumptions, subject_id: string): TaxConsequence {
  const id: TaxConsequenceId = "tax.nol_carryover_categorical";
  const spec = CATALOG_BY_ID.get(id)!;
  const stockish = ["stock", "stock_with_338_h_10", "stock_with_336_e"];
  if (canon.disclosed_nols_present !== true || !stockish.includes(s.deal_structure)) {
    return notEmitted(id, spec.domain, subject_id, "NOL carryover", "A");
  }
  const inputs = provFromSpec(spec, canon, s);
  if (isNum(canon.disclosed_nol_amount)) inputs.push({ name: "disclosed_nol_amount", value: canon.disclosed_nol_amount, source: "canonical_market_truth" });
  return categorical(spec, subject_id, "NOL carryover", spec.emitted_text as string, inputs);
}

function build1245(canon: TaxCanonicalFacts, s: TaxScenarioAssumptions, subject_id: string): TaxConsequence {
  const id: TaxConsequenceId = "tax.character_1245_recapture";
  const spec = CATALOG_BY_ID.get(id)!;
  const depHistory = isNum(canon.accelerated_depreciation_present) || canon.recapture_sensitive_classes_present === true;
  if (!isPos(s.ppa_equipment) || !depHistory) return notEmitted(id, spec.domain, subject_id, "§1245 recapture character", "A");
  return categorical(spec, subject_id, "§1245 recapture character", spec.emitted_text as string, provFromSpec(spec, canon, s));
}

function build1250(canon: TaxCanonicalFacts, s: TaxScenarioAssumptions, subject_id: string): TaxConsequence {
  const id: TaxConsequenceId = "tax.character_1250_recapture";
  const spec = CATALOG_BY_ID.get(id)!;
  if (!isPos(s.ppa_real_property)) return notEmitted(id, spec.domain, subject_id, "§1250 recapture character", "A");
  return categorical(spec, subject_id, "§1250 recapture character", spec.emitted_text as string, provFromSpec(spec, canon, s));
}

// seller note lives on the acquisition scenario; passed in as a small struct
export interface SellerNoteInput { principal: number | null; annual_rate: number | null; term_years: number | null; }
function buildSellerNoteInterest(sellerNote: SellerNoteInput | null, subject_id: string): TaxConsequence {
  const id: TaxConsequenceId = "tax.seller_note_interest_characterization";
  const spec = CATALOG_BY_ID.get(id)!;
  if (!sellerNote || !isPos(sellerNote.principal)) return notEmitted(id, spec.domain, subject_id, "Seller-note interest characterization", "A");
  const inputs: TaxInputValueUsed[] = [
    { name: "seller_note.principal", value: sellerNote.principal, source: "scenario_assumption" },
    { name: "seller_note.annual_rate", value: sellerNote.annual_rate, source: "scenario_assumption" },
    { name: "seller_note.term_years", value: sellerNote.term_years, source: "scenario_assumption" },
  ];
  return categorical(spec, subject_id, "Seller-note interest characterization", spec.emitted_text as string, inputs);
}

function buildBasisStepUp(canon: TaxCanonicalFacts, s: TaxScenarioAssumptions, subject_id: string): TaxConsequence {
  const id: TaxConsequenceId = "tax.basis_step_up_mechanics";
  const spec = CATALOG_BY_ID.get(id)!;
  if (s.deal_structure === "unspecified") return notComputable(id, spec.domain, subject_id, "Basis step-up mechanics", "A", spec.not_computable_reasons.deal_structure_unspecified, provFromSpec(spec, canon, s));
  const text = pickVariant(spec, s.deal_structure);
  if (!text) return notComputable(id, spec.domain, subject_id, "Basis step-up mechanics", "A", spec.not_computable_reasons.deal_structure_unspecified, provFromSpec(spec, canon, s));
  return categorical(spec, subject_id, "Basis step-up mechanics", text, provFromSpec(spec, canon, s));
}

function buildRemainingBasis(canon: TaxCanonicalFacts, s: TaxScenarioAssumptions, subject_id: string): TaxConsequence {
  const id: TaxConsequenceId = "tax.remaining_tax_basis_by_class";
  const spec = CATALOG_BY_ID.get(id)!;
  if (canon.existing_tax_basis_disclosed !== true) return notComputable(id, spec.domain, subject_id, "Remaining tax basis by class", "A", spec.not_computable_reasons.basis_not_disclosed, provFromSpec(spec, canon, s));
  const basis = canon.existing_tax_basis_by_class;
  if (!basis || Object.keys(basis).length === 0) return notComputable(id, spec.domain, subject_id, "Remaining tax basis by class", "A", spec.not_computable_reasons.no_per_class_values, provFromSpec(spec, canon, s));
  const classes: [string, number | undefined, number | null][] = [
    ["Goodwill", basis.goodwill, s.ppa_goodwill],
    ["Equipment", basis.equipment, s.ppa_equipment],
    ["Real property", basis.real_property, s.ppa_real_property],
    ["Other intangibles", basis.other_intangibles, s.ppa_other_intangibles],
    ["Working capital", basis.working_capital, s.ppa_working_capital],
  ];
  const inputs: TaxInputValueUsed[] = [{ name: "existing_tax_basis_disclosed", value: true, source: "canonical_market_truth" }];
  const lines: string[] = [];
  for (const [label, existing, alloc] of classes) {
    if (isNum(existing) && isNum(alloc)) {
      lines.push(`— ${label}: existing basis ${usd(existing)}, scenario allocation ${usd(alloc)}`);
      inputs.push({ name: `existing_tax_basis_by_class.${label.toLowerCase().replace(" ", "_")}`, value: existing, source: "canonical_market_truth" });
      inputs.push({ name: `ppa_${label.toLowerCase().replace(" ", "_")}`, value: alloc, source: "scenario_assumption" });
    }
  }
  if (lines.length === 0) return notComputable(id, spec.domain, subject_id, "Remaining tax basis by class", "A", spec.not_computable_reasons.no_scenario_allocation, provFromSpec(spec, canon, s));
  const text = `Remaining tax basis by class:\n${lines.join("\n")}\n\n${spec.emitted_text as string}`;
  return categorical(spec, subject_id, "Remaining tax basis by class", text, inputs);
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────
export interface TaxConsequenceSet {
  subject_id: string;
  consequences: TaxConsequence[]; // emitted only (non-emitted are filtered out)
  meta: { calculated_at: string; calculator_version: string; consequence_count: number };
}

export function calculateTaxConsequences(
  canon: TaxCanonicalFacts,
  s: TaxScenarioAssumptions,
  sellerNote: SellerNoteInput | null = null,
): TaxConsequenceSet {
  const sid = "subject"; // caller sets the real subject_id; kept simple for purity
  // arithmetic
  const sec197 = buildSec197(s, sid);
  const equip = buildMacrsEquipment(s, sid);
  const realprop = buildMacrsRealProperty(s, sid);
  const totalRec = buildTotalRecovery(s, sid, sec197, equip, realprop);
  // categorical (Bucket A)
  const structural = buildStructuralDifference(canon, s, sid);
  const e338 = buildElection("tax.election_effect_338_h_10", "§338(h)(10) election effect", ["stock", "stock_with_338_h_10"], canon, s, sid);
  const e336 = buildElection("tax.election_effect_336_e", "§336(e) election effect", ["stock", "stock_with_336_e"], canon, s, sid);
  const nol = buildNolCarryover(canon, s, sid);
  const c1245 = build1245(canon, s, sid);
  const c1250 = build1250(canon, s, sid);
  const snote = buildSellerNoteInterest(sellerNote, sid);
  const basis = buildBasisStepUp(canon, s, sid);
  const remaining = buildRemainingBasis(canon, s, sid);
  // Bucket B
  const shield197 = buildSec197Shield(s, sid, sec197);
  const shieldEquip = buildMacrsEquipShield(s, sid, equip);
  const sellerSplit = buildSellerCharacterSplit(s, sid);

  const all = [
    structural, e338, e336, nol, c1245, c1250, snote, basis, remaining,
    sec197, equip, realprop, totalRec,
    shield197, shieldEquip, sellerSplit,
  ];
  // filter out structurally non-emitted consequences
  const consequences = all.filter((c) => c.emitted);
  return {
    subject_id: s.deal_structure ? sid : sid,
    consequences,
    meta: { calculated_at: new Date().toISOString(), calculator_version: TAX_CALCULATOR_VERSION, consequence_count: consequences.length },
  };
}
