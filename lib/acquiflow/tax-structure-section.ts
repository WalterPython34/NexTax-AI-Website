// lib/acquiflow/tax-structure-section.ts
// ═════════════════════════════════════════════════════════════════════════════
// TAX / STRUCTURE SECTION — render-ready data builder for the AcquiFlow-Intel
// deal report. PURE: row → verified adapter → frozen calculator → a plain data
// structure the generator's drawTaxStructurePage() paints in the memo aesthetic.
//
// No jsPDF here (unit-testable), no engine changes, no IO. Firewall preserved
// structurally: only the persisted INST-eligible row is ever seen, and the
// Bucket-B OPS-only tax-shield consequences (annual_197_tax_shield,
// annual_macrs_tax_shield_equipment) are DELIBERATELY EXCLUDED from the
// institutional section — they never render here.
//
// No saved row → present:false → generator renders honest "not yet specified".
// ═════════════════════════════════════════════════════════════════════════════

import {
  rowToEngineInput,
  type DealTaxAssumptionsRow,
  type DealContextLite,
} from "@/lib/intelligence/tax/tax-row-to-engine-input";
import {
  calculateTaxConsequences,
  type TaxConsequence,
  type TaxScheduleRow,
} from "@/lib/intelligence/tax/tax-consequence-calculator";

export const TAX_SECTION_BUILDER_VERSION = "tax-structure-section-v1.0.0";

// ── render-ready shapes (consumed by drawTaxStructurePage in the generator) ──
export interface TaxStructureScheduleRow { label: string; amount: number | null; }
export interface TaxStructureStatement {
  heading: string;
  body: string;
  seam: "fact" | "assumption";
}
export interface TaxStructureSchedule {
  heading: string;
  rows: TaxStructureScheduleRow[];
  total: number | null;
  basis_note: string | null;
}
export interface TaxStructureSection {
  present: boolean;
  structure_label: string;
  entity_label: string;
  statements: TaxStructureStatement[];
  schedules: TaxStructureSchedule[];
  absent_notes: string[];
  provenance: string;
}

// ── display labels (mirror engine enum values; display only) ──
const STRUCTURE_LABEL: Record<string, string> = {
  asset: "Asset purchase",
  stock: "Stock purchase",
  stock_with_338_h_10: "Stock purchase + \u00A7338(h)(10)",
  stock_with_336_e: "Stock purchase + \u00A7336(e)",
  unspecified: "Not yet specified",
};
const ENTITY_LABEL: Record<string, string> = {
  c_corp: "C-Corporation",
  s_corp: "S-Corporation",
  llc_partnership: "LLC (taxed as partnership)",
  llc_disregarded: "Single-member / disregarded LLC",
  sole_prop: "Sole proprietorship",
  unknown: "Not yet specified",
};

// categorical statement headings, by real consequence_id
const STATEMENT_HEADINGS: Record<string, string> = {
  "tax.structural_difference_asset_vs_stock": "Structural treatment",
  "tax.election_effect_338_h_10": "\u00A7338(h)(10) election",
  "tax.election_effect_336_e": "\u00A7336(e) election",
  "tax.nol_carryover_categorical": "Net operating losses",
  "tax.character_1245_recapture": "\u00A71245 recapture character",
  "tax.character_1250_recapture": "\u00A71250 recapture character",
  "tax.seller_note_interest_characterization": "Seller-note interest",
  "tax.basis_step_up_mechanics": "Basis step-up",
  "tax.remaining_tax_basis_by_class": "Remaining tax basis",
  "tax.seller_character_split_categorical": "Seller gain character",
};
// schedule headings, by real consequence_id (FACT schedules only)
const SCHEDULE_HEADINGS: Record<string, string> = {
  "tax.sec197_amortization_schedule": "\u00A7197 intangible amortization",
  "tax.macrs_recovery_schedule_equipment": "Equipment cost recovery (MACRS)",
  "tax.macrs_recovery_schedule_real_property": "Real-property cost recovery",
  "tax.total_basis_recovery_schedule": "Total basis recovery",
};
// Bucket-B OPS-only ids — NEVER render in the institutional section (firewall)
const OPS_ONLY_IDS = new Set<string>([
  "tax.annual_197_tax_shield",
  "tax.annual_macrs_tax_shield_equipment",
]);

// schedule/amortization + structural facts cross the seam as FACT
function seamFor(domain: string): "fact" | "assumption" {
  return domain === "tax_structural_treatment" || domain === "tax_amortization_depreciation"
    ? "fact" : "assumption";
}

// pick the dollar value out of a schedule row (columns vary by consequence)
function rowAmount(r: TaxScheduleRow): number | null {
  if (typeof r.amount === "number") return r.amount;
  if (typeof r.total === "number") return r.total;
  if (typeof r.deduction === "number") return r.deduction;
  return null;
}

export function buildTaxStructureSection(
  row: DealTaxAssumptionsRow | null,
  ctx: DealContextLite = {},
): TaxStructureSection {
  const provenance =
    `Structural reads grounded in buyer-entered assumptions; allocation amounts labeled. ${TAX_SECTION_BUILDER_VERSION}.`;

  if (!row) {
    return {
      present: false,
      structure_label: "Not yet specified",
      entity_label: "Not yet specified",
      statements: [],
      schedules: [],
      absent_notes: [
        "No transaction-structure assumptions have been entered for this deal.",
        "Enter structure, entity, and purchase-price allocation in the Tax Assumptions tab to populate this section.",
      ],
      provenance,
    };
  }

  const { canon, scenario, sellerNote } = rowToEngineInput(row, ctx);
  const set = calculateTaxConsequences(canon, scenario, sellerNote);

  const statements: TaxStructureStatement[] = [];
  const schedules: TaxStructureSchedule[] = [];
  const absent_notes: string[] = [];

  // set.consequences contains EMITTED consequences only (engine filters the rest).
  for (const c of set.consequences) {
    if (OPS_ONLY_IDS.has(c.consequence_id)) continue; // firewall: never render shields

    // schedules (FACT)
    if (SCHEDULE_HEADINGS[c.consequence_id]) {
      if (c.computability_status === "not_computable" || !c.schedule || c.schedule.length === 0) {
        absent_notes.push(`${SCHEDULE_HEADINGS[c.consequence_id]}: not computable from current inputs.`);
        continue;
      }
      const rows: TaxStructureScheduleRow[] = c.schedule.map((s) => ({
        label: `Year ${s.year}`,
        amount: rowAmount(s),
      }));
      const total = rows.reduce((a, r) => a + (typeof r.amount === "number" ? r.amount : 0), 0);
      schedules.push({
        heading: SCHEDULE_HEADINGS[c.consequence_id],
        rows,
        total,
        basis_note: deriveBasisNote(c),
      });
      continue;
    }

    // categorical statements
    if (STATEMENT_HEADINGS[c.consequence_id]) {
      if (c.computability_status === "not_computable" || !c.statement_text) {
        absent_notes.push(`${STATEMENT_HEADINGS[c.consequence_id]}: not yet specified.`);
        continue;
      }
      statements.push({
        heading: STATEMENT_HEADINGS[c.consequence_id],
        body: c.statement_text,
        seam: seamFor(c.domain),
      });
    }
  }

  return {
    present: true,
    structure_label: STRUCTURE_LABEL[scenario.deal_structure] ?? "Not yet specified",
    entity_label: ENTITY_LABEL[canon.target_entity_type] ?? "Not yet specified",
    statements,
    schedules,
    absent_notes,
    provenance,
  };
}

// short "assuming $X goodwill + $Y intangibles" note from the consequence's own
// inputs (No False Precision). Never invents — reads input_values_used only.
function deriveBasisNote(c: TaxConsequence): string | null {
  if (!c.input_values_used || c.input_values_used.length === 0) return null;
  const parts = c.input_values_used
    .filter((i) => typeof i.value === "number" && (i.value as number) > 0)
    .map((i) => `${prettyInput(i.name)} ${fmtUsdShort(i.value as number)}`);
  return parts.length ? `Assumes ${parts.join(" + ")}.` : null;
}
function prettyInput(name: string): string {
  return name.replace(/^scenario\./, "").replace(/^ppa_/, "").replace(/_/g, " ").trim();
}
function fmtUsdShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}
