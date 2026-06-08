// lib/acquiflow/tax-drilldown-adapter.ts
// ═════════════════════════════════════════════════════════════════════════════
// TAX FACT DRILLDOWN — adapter layer.
//
// Maps the FIVE already-rendered workspace view models into a single presentation
// contract (DrilldownViewModel) the drawer consumes. This module is PURE MAPPING:
//   • It re-derives NOTHING. Every value is read from a view model the tab already
//     built (Invariant 1). Formula strings DESCRIBE documented field relationships
//     using existing values; they never recompute.
//   • Provenance is the locked v1 model: FACT / ASSUMPTION / DERIVED only.
//     EXTRACTED is reserved in the type and NEVER assigned — the system captures
//     no document-level source, so a document seam would be fabricated precision.
//   • Source + evidence labels are honest: buyer input / saved deal field /
//     buyer-entered assumption / AcquiFlow-derived; evidence reads buyer-asserted
//     / assumed. No "tax return", "Form 8594", or "depreciation schedule" sources.
//   • Language firewall: no "savings"/"best"/"better"/"winner"/"recommended".
//     Dollar/rate computations carry analysisOnly + an assumption basis (T5).
// ═════════════════════════════════════════════════════════════════════════════

import type {
  TaxSnapshot,
  TaxFactLine,
  TaxImplicationStatement,
  TaxImplicationSchedule,
  BasisDeltaView,
} from "@/lib/acquiflow/tax-snapshot-derivations";
import type {
  StructuralComparisonPanelPlan,
  ComparisonStructureId,
} from "@/lib/acquiflow/structural-comparison";

// ── Presentation contract ────────────────────────────────────────────────────

/** EXTRACTED is reserved for a future document-extraction layer; unused in v1. */
export type Provenance = "FACT" | "ASSUMPTION" | "DERIVED" | "EXTRACTED";
export type DrilldownFocus = "facts" | "computation" | "implication";
export type ComputabilityStatus = "computable" | "assumption_bound" | "not_computable";
export type SourceRowType =
  | "snapshot" | "tax_fact" | "tax_implication"
  | "calculated_difference" | "structural_comparison";

export interface DrilldownFact {
  label: string;
  value: string;                 // pre-formatted upstream; never computed here
  provenance: Provenance;
  evidenceQuality: string;
  sourceLabel: string;
  missing?: boolean;
  missingReason?: string | null;
}
export interface DrilldownInput { name: string; value: string; source: Provenance; }
export interface DrilldownComputation {
  label: string;
  formulaDisplay: string;        // describes existing-field relationship; no recompute
  inputsUsed: DrilldownInput[];
  computabilityStatus: ComputabilityStatus;
  notComputableReason?: string | null;
  analysisOnly: boolean;         // dollar/rate → true → drawer shows the firewall banner
  assumptionBasis: string;
}
export interface DrilldownImplication { text: string; conditions?: string[]; }
export interface DrilldownViewModel {
  title: string;
  analysisOnlyBadge: boolean;
  focus: DrilldownFocus;
  sourceRowType: SourceRowType;
  facts: DrilldownFact[];
  computation?: DrilldownComputation | null;
  implication?: DrilldownImplication | null;
}

// ── Honest provenance vocabulary (the single source of truth) ─────────────────

const SOURCE_LABEL: Record<Provenance, string> = {
  FACT:       "Buyer input / saved deal field",
  ASSUMPTION: "Buyer-entered assumption",
  DERIVED:    "AcquiFlow-derived",
  EXTRACTED:  "Document-extracted",   // reserved — never emitted in v1
};
const EVIDENCE_QUALITY: Record<Provenance, string> = {
  FACT:       "Buyer-asserted",
  ASSUMPTION: "Buyer-asserted / assumed",
  DERIVED:    "Derived by AcquiFlow from buyer-entered facts + assumptions",
  EXTRACTED:  "Document-substantiated", // reserved — never emitted in v1
};
const seamToProvenance = (seam: "fact" | "assumption"): Provenance =>
  seam === "fact" ? "FACT" : "ASSUMPTION";

function fact(
  label: string,
  value: string,
  provenance: Provenance,
  opts?: { missing?: boolean; missingReason?: string | null },
): DrilldownFact {
  return {
    label,
    value,
    provenance,
    sourceLabel: SOURCE_LABEL[provenance],
    evidenceQuality: EVIDENCE_QUALITY[provenance],
    missing: opts?.missing ?? false,
    missingReason: opts?.missingReason ?? null,
  };
}

const STRUCT_LABEL: Record<ComparisonStructureId, string> = {
  asset: "Asset purchase",
  stock: "Stock purchase",
  stock_with_338_h_10: "Stock + §338(h)(10)",
  stock_with_336_e: "Stock + §336(e)",
};

const money = (n: number | null): string =>
  n === null ? "—" : (n < 0 ? "-" : "") + "$" + Math.round(Math.abs(n)).toLocaleString("en-US");

// A snapshot label that signals incompleteness rather than a known status.
const isAbsentLabel = (v: string): boolean =>
  /^(Not yet computable|Not yet evaluated|Not disclosed|Not identified|Not Started)$/.test(v);

// ── 2. Tax Facts row → Layer 1 only ───────────────────────────────────────────
export function buildTaxFactDrilldown(line: TaxFactLine): DrilldownViewModel {
  const prov = seamToProvenance(line.seam);
  return {
    title: line.label,
    analysisOnlyBadge: false,
    focus: "facts",
    sourceRowType: "tax_fact",
    facts: [fact(line.label, line.value, prov)],
    computation: null,
    implication: null,
  };
}

// ── 1. Snapshot row → facts (+ honest absence) ────────────────────────────────
export type SnapshotRowId =
  | "structure" | "entity" | "basis_recovery" | "recapture_exposure"
  | "nol_position" | "readiness" | "evaluated" | "key_missing_input" | "evidence_gap";

const SNAPSHOT_TITLE: Record<SnapshotRowId, string> = {
  structure: "Structure",
  entity: "Entity",
  basis_recovery: "Basis Recovery",
  recapture_exposure: "Recapture Exposure",
  nol_position: "NOL Position",
  readiness: "Structure Readiness",
  evaluated: "Tax Structure Evaluated",
  key_missing_input: "Key Missing Input",
  evidence_gap: "Evidence Gap",
};

export function buildSnapshotDrilldown(snap: TaxSnapshot, rowId: SnapshotRowId): DrilldownViewModel {
  const base = {
    title: SNAPSHOT_TITLE[rowId],
    analysisOnlyBadge: false,
    focus: "facts" as const,
    sourceRowType: "snapshot" as const,
    computation: null,
    implication: null,
  };
  const gapReason = snap.evidence_gap !== "—" ? snap.evidence_gap
    : snap.key_missing_input !== "—" ? snap.key_missing_input
    : null;

  switch (rowId) {
    // Structure & entity are buyer-entered structural facts.
    case "structure":
      return { ...base, facts: [fact("Structure", snap.structure_label, "FACT")] };
    case "entity":
      return { ...base, facts: [fact("Entity", snap.entity_label, "FACT")] };

    // Status labels — DERIVED summaries. Absent labels open to honest-absence.
    case "basis_recovery":
    case "recapture_exposure":
    case "nol_position":
    case "evaluated": {
      const value =
        rowId === "basis_recovery" ? snap.basis_recovery
        : rowId === "recapture_exposure" ? snap.recapture_exposure
        : rowId === "nol_position" ? snap.nol_position
        : snap.evaluated;
      const absent = isAbsentLabel(value);
      return {
        ...base,
        facts: [fact(SNAPSHOT_TITLE[rowId], value, "DERIVED", {
          missing: absent,
          missingReason: absent ? (gapReason ?? "Not yet computable from current inputs.") : null,
        })],
      };
    }

    // Readiness — a DERIVED completeness count; unmet categories are the gap.
    case "readiness": {
      const facts: DrilldownFact[] = [
        fact("Categories specified", `${snap.readiness.ready} / ${snap.readiness.total}`, "DERIVED"),
      ];
      if (snap.readiness.unmet.length > 0) {
        facts.push(fact(
          "Not yet specified",
          snap.readiness.unmet.join(", "),
          "DERIVED",
          { missing: true, missingReason: "These readiness categories have no buyer input yet." },
        ));
      }
      return { ...base, facts };
    }

    // Key Missing Input / Evidence Gap — these ARE the gap surface.
    case "key_missing_input": {
      const none = snap.key_missing_input === "—";
      return {
        ...base,
        facts: [fact("Key Missing Input", none ? "None outstanding" : snap.key_missing_input, "DERIVED", {
          missing: !none,
          missingReason: none ? null : "Highest-priority input not yet provided.",
        })],
      };
    }
    case "evidence_gap": {
      const none = snap.evidence_gap === "—";
      return {
        ...base,
        facts: [fact("Evidence Gap", none ? "No gap flagged" : snap.evidence_gap, "DERIVED", {
          missing: !none,
          missingReason: none ? null : "A foundational category is unspecified, so some reads are withheld.",
        })],
      };
    }
  }
}

// ── 3a. Tax Implications STATEMENT → implication (Layer 3) ────────────────────
// A bare prose statement has no computation, so it focuses Layer 3 (the read).
// (Schedules — which carry the dollar computation — focus Layer 2 below.)
export function buildImplicationStatementDrilldown(st: TaxImplicationStatement): DrilldownViewModel {
  return {
    title: st.heading,
    analysisOnlyBadge: false,
    focus: "implication",
    sourceRowType: "tax_implication",
    facts: [],
    computation: null,
    implication: { text: st.body },
  };
}

// ── 3b. Tax Implications SCHEDULE → computation (Layer 2) ─────────────────────
export function buildImplicationScheduleDrilldown(sch: TaxImplicationSchedule): DrilldownViewModel {
  const inputs: DrilldownInput[] = sch.rows.map(r => ({
    name: r.label,
    value: money(r.amount),
    source: "DERIVED",        // schedule lines are AcquiFlow-derived from the allocation
  }));
  const anyNull = sch.rows.some(r => r.amount === null);
  const status: ComputabilityStatus =
    sch.total === null ? "not_computable" : anyNull ? "assumption_bound" : "computable";
  return {
    title: sch.heading,
    analysisOnlyBadge: true,    // dollar schedule
    focus: "computation",
    sourceRowType: "tax_implication",
    facts: [],
    computation: {
      label: sch.heading,
      formulaDisplay: sch.total === null
        ? "Schedule total not yet computable from current inputs."
        : `Total = sum of line items (${money(sch.total)})`,
      inputsUsed: inputs,
      computabilityStatus: status,
      notComputableReason: sch.total === null
        ? (sch.basis_note ?? "One or more allocated classes has not produced a schedule yet.")
        : null,
      analysisOnly: true,
      assumptionBasis: sch.basis_note
        ?? "Derived by AcquiFlow from the buyer-entered PPA allocation and recovery classes.",
    },
    implication: null,
  };
}

// ── 4. Calculated Difference value → computation (Layer 2) ────────────────────
export type CalcDiffValueId =
  | "asset_recoverable_basis" | "stock_recoverable_basis" | "basis_difference"
  | "asset_year1_recovery" | "stock_year1_recovery" | "year1_recovery_difference"
  | "tax_shield_year1";

const CALC_TITLE: Record<CalcDiffValueId, string> = {
  asset_recoverable_basis: "New recoverable basis — asset purchase",
  stock_recoverable_basis: "New recoverable basis — stock purchase",
  basis_difference: "New recoverable basis — difference",
  asset_year1_recovery: "Year-1 basis recovery — asset purchase",
  stock_year1_recovery: "Year-1 basis recovery — stock purchase",
  year1_recovery_difference: "Year-1 basis recovery — difference",
  tax_shield_year1: "Estimated Year-1 tax shield preview",
};

export function buildCalcDiffDrilldown(view: BasisDeltaView, valueId: CalcDiffValueId): DrilldownViewModel {
  const base = {
    title: CALC_TITLE[valueId],
    analysisOnlyBadge: true,            // the whole card is analysis-only
    focus: "computation" as const,
    sourceRowType: "calculated_difference" as const,
    facts: [],
    implication: null,
  };

  // Whole-card not-computable.
  if (!view.computable) {
    return {
      ...base,
      computation: {
        label: CALC_TITLE[valueId],
        formulaDisplay: "Not computable from current inputs.",
        inputsUsed: [],
        computabilityStatus: "not_computable",
        notComputableReason: view.absent_reason ?? "Not yet computable from current inputs.",
        analysisOnly: true,
        assumptionBasis: "Analysis-only preview. Requires more buyer input before any figure is shown.",
      },
    };
  }

  const partial = view.partial_gap_note
    ? ` ${view.partial_gap_note}`
    : "";

  switch (valueId) {
    case "basis_difference":
      return { ...base, computation: {
        label: CALC_TITLE[valueId],
        formulaDisplay: "Asset-purchase recoverable basis − stock-purchase recoverable basis",
        inputsUsed: [
          { name: "Asset recoverable basis", value: money(view.asset_recoverable_basis), source: "DERIVED" },
          { name: "Stock recoverable basis", value: money(view.stock_recoverable_basis), source: "DERIVED" },
        ],
        computabilityStatus: "computable",
        analysisOnly: true,
        assumptionBasis: "Derived by AcquiFlow from the buyer-entered PPA allocation. Stock recoverable basis is $0 by definition (no basis step-up under a stock purchase)." + partial,
      }};

    case "year1_recovery_difference":
      return { ...base, computation: {
        label: CALC_TITLE[valueId],
        formulaDisplay: "Asset-purchase Year-1 recovery − stock-purchase Year-1 recovery",
        inputsUsed: [
          { name: "Asset Year-1 recovery", value: money(view.asset_year1_recovery), source: "DERIVED" },
          { name: "Stock Year-1 recovery", value: money(view.stock_year1_recovery), source: "DERIVED" },
        ],
        computabilityStatus: "computable",
        analysisOnly: true,
        assumptionBasis: "Derived by AcquiFlow from the buyer-entered recovery classes." + partial,
      }};

    case "tax_shield_year1": {
      const noRate = view.tax_shield_year1 === null;
      return { ...base, computation: {
        label: CALC_TITLE[valueId],
        formulaDisplay: noRate
          ? "Asset Year-1 recovery × buyer ordinary planning rate"
          : `Asset Year-1 recovery × buyer ordinary rate = ${money(view.tax_shield_year1)}`,
        inputsUsed: [
          { name: "Asset Year-1 recovery", value: money(view.asset_year1_recovery), source: "DERIVED" },
          { name: "Buyer ordinary planning rate", value: view.buyer_ordinary_rate === null ? "—" : `${Math.round(view.buyer_ordinary_rate * 100)}%`, source: "ASSUMPTION" },
        ],
        computabilityStatus: noRate ? "not_computable" : "assumption_bound",
        notComputableReason: noRate ? view.tax_shield_message : null,
        analysisOnly: true,
        assumptionBasis: "Analysis-only preview of an estimated deduction effect. Uses the buyer-entered ordinary planning rate; it is not an institutional figure and never enters the report's institutional layer.",
      }};
    }

    // Single recoverable-basis / Year-1 values (point reads of an existing field).
    default: {
      const value =
        valueId === "asset_recoverable_basis" ? view.asset_recoverable_basis
        : valueId === "stock_recoverable_basis" ? view.stock_recoverable_basis
        : valueId === "asset_year1_recovery" ? view.asset_year1_recovery
        : view.stock_year1_recovery;
      const isStock = valueId.startsWith("stock_");
      return { ...base, computation: {
        label: CALC_TITLE[valueId],
        formulaDisplay: `${money(value)} (as derived for this structure)`,
        inputsUsed: [{ name: CALC_TITLE[valueId], value: money(value), source: "DERIVED" }],
        computabilityStatus: "computable",
        analysisOnly: true,
        assumptionBasis: isStock
          ? "Stock purchase produces no new recoverable basis by definition ($0)."
          : "Derived by AcquiFlow from the buyer-entered PPA allocation and recovery classes." + partial,
      }};
    }
  }
}

// ── 5. Structural Comparison row → implication (Layer 3) ──────────────────────
export function buildComparisonDrilldown(
  plan: StructuralComparisonPanelPlan,
  dimensionId: string,
): DrilldownViewModel {
  const row = plan.comparison_rows.find(r => r.dimension === dimensionId);
  // Caller only launches visible rows; guard the reserved hidden slot defensively.
  if (!row || !row.visible) {
    return {
      title: "Structural comparison",
      analysisOnlyBadge: false,
      focus: "implication",
      sourceRowType: "structural_comparison",
      facts: [],
      computation: null,
      implication: { text: plan.bottom_line, conditions: ["The two structures cannot be ranked from current inputs."] },
    };
  }

  const facts: DrilldownFact[] = plan.columns.map(col => {
    const cell = row.by_structure[col.structure];
    const absent = cell === null || cell === undefined || cell === "";
    return fact(
      STRUCT_LABEL[col.structure] ?? col.structure,
      absent ? "Not applicable under this structure" : (cell as string),
      "DERIVED",
      { missing: absent, missingReason: absent ? "This dimension does not apply under this structure." : null },
    );
  });

  return {
    title: row.dimension_label,
    analysisOnlyBadge: false,
    focus: "implication",
    sourceRowType: "structural_comparison",
    facts,
    computation: null,
    implication: {
      text: plan.bottom_line,
      conditions: ["The two structures cannot be ranked from current inputs — they differ in evidence requirements and tax timing, not in measurable advantage."],
    },
  };
}
