// lib/acquiflow/structural-comparison.ts
// ═════════════════════════════════════════════════════════════════════════════
// STRUCTURAL COMPARISON — shared presentation framework (Invariant 4).
//
// Owns the panel's type surface and the cross-factor row aggregation.
// Does NOT own any factor's logic — Tax rows come from tax-snapshot-derivations,
// future Transferability rows from transferability-derivations, etc.
//
// v1 only Tax contributes. Type architecture reserves transferability_considerations
// as a sixth dimension slot; v1 UI does not render the hidden slot.
// ═════════════════════════════════════════════════════════════════════════════

import type { TaxAssumptionRecord } from "@/components/TaxAssumptionsTab";

// ── dimension catalog (seven slots, six visible in v1) ──
export type ComparisonDimensionId =
  | "basis_treatment"
  | "calculated_difference"  // Patch B — quantitative basis delta row
  | "tax_attributes"
  | "seller_recognition"
  | "election_prereqs"
  | "evidence_required"
  | "transferability_considerations"; // v1 hidden — UI must not render

// ── structures appearing as columns ──
export type ComparisonStructureId =
  | "asset"
  | "stock"
  | "stock_with_338_h_10"
  | "stock_with_336_e";

// ── column emphasis levels ──
export type ColumnEmphasis = "primary" | "secondary" | "muted" | "neutral";

// ── one row across all four possible structures ──
export interface StructuralComparisonRow {
  dimension: ComparisonDimensionId;
  dimension_label: string;
  /**
   * True when this row should render in the v1 UI.
   * transferability_considerations is the only row currently false.
   */
  visible: boolean;
  /**
   * Per-structure cell content. null = "not applicable under this structure"
   * (renders as em-dash in UI).
   */
  by_structure: Partial<Record<ComparisonStructureId, string | null>>;
}

// ── column ordering and emphasis for the active selection ──
export interface ComparisonColumn {
  structure: ComparisonStructureId;
  emphasis: ColumnEmphasis;
  computable_now: boolean;
}

// ── the full panel plan ──
export interface StructuralComparisonPanelPlan {
  visible: boolean;
  active_structure: TaxAssumptionRecord["ppa_structure"];
  columns: ComparisonColumn[];
  comparison_rows: StructuralComparisonRow[];
  /**
   * Neutral structural-difference statement.
   * Must close with the hedge that structures cannot be ranked from current inputs.
   */
  bottom_line: string;
}

// ── module surface ──
// (bodies are stubs at this stage of build — tests will fail with the expected error.)

/**
 * Compose the panel from per-factor row contributions.
 * v1: receives only Tax rows. Future: aggregates Tax + Transferability + ...
 */
// Column emphasis decision: based on which structure is selected.
function columnsFor(
  activeStructure: TaxAssumptionRecord["ppa_structure"],
): ComparisonColumn[] {
  const has = (s: ComparisonStructureId): ComparisonColumn => ({
    structure: s,
    emphasis: "neutral",
    computable_now: false,
  });
  switch (activeStructure) {
    case "asset":
      return [
        { structure: "asset", emphasis: "primary", computable_now: true },
        { structure: "stock", emphasis: "secondary", computable_now: true },
      ];
    case "stock":
      return [
        { structure: "asset", emphasis: "secondary", computable_now: true },
        { structure: "stock", emphasis: "primary", computable_now: true },
      ];
    case "stock_with_338_h_10":
      return [
        { structure: "stock_with_338_h_10", emphasis: "primary", computable_now: true },
        { structure: "asset", emphasis: "muted", computable_now: true },
        { structure: "stock", emphasis: "muted", computable_now: true },
      ];
    case "stock_with_336_e":
      return [
        { structure: "stock_with_336_e", emphasis: "primary", computable_now: true },
        { structure: "asset", emphasis: "muted", computable_now: true },
        { structure: "stock", emphasis: "muted", computable_now: true },
      ];
    case "unspecified":
    default:
      // No primary; both shown un-emphasized; cells show what's computable
      // (which is little — emphasis = neutral, computable_now = false).
      return [has("asset"), has("stock")];
  }
}

export function buildStructuralComparisonPanel(
  rec: TaxAssumptionRecord,
  taxRows: StructuralComparisonRow[],
): StructuralComparisonPanelPlan {
  const active = rec.ppa_structure;
  const columns = columnsFor(active);

  // Filter rows to v1-visible only. The transferability slot exists in the type
  // but is not rendered until the Transferability module ships.
  const visibleRows = taxRows.filter(r => r.visible);
  // However the test wants to *find* the hidden row to verify it's reserved, so
  // we don't strip it from the returned plan — we keep it, with visible:false.
  // The UI is responsible for honoring `visible` when rendering.
  const comparison_rows = taxRows;

  // Neutral structural-difference bottom line. The plan section §3 specifies
  // this must close with the explicit hedge that structures cannot be ranked.
  const bottom_line = buildBottomLine(active);

  return {
    visible: true,
    active_structure: active,
    columns,
    comparison_rows,
    bottom_line,
  };
}

function buildBottomLine(active: TaxAssumptionRecord["ppa_structure"]): string {
  const hedge = "The two structures cannot be ranked from current inputs — they differ in evidence requirements and tax timing, not in measurable advantage.";
  switch (active) {
    case "asset":
    case "stock":
      return "Under current assumptions, the asset structure produces new §197 basis the stock structure does not. The stock structure preserves the seller's historical basis and may retain entity-level tax attributes. " + hedge;
    case "stock_with_338_h_10":
      return "A §338(h)(10) election causes the stock acquisition to be treated as a deemed asset acquisition for federal tax purposes. The election has specific preconditions; the system does not verify them. " + hedge;
    case "stock_with_336_e":
      return "A §336(e) election causes the disposition to be treated as a deemed asset disposition by the target for federal tax purposes. The election has specific eligibility preconditions distinct from §338(h)(10); the system does not verify them. " + hedge;
    case "unspecified":
    default:
      return "Transaction structure has not yet been specified. Both Asset and Stock pathways are shown to surface what each would require to evaluate. " + hedge;
  }
}
