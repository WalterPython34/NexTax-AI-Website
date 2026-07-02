// lib/contentEngine/factSheet.ts
// ─────────────────────────────────────────────────────────────────────────────
// Reddit Content Engine — §2.3 fact sheet (Stage 1).
//
// The fact sheet is the ONLY source of numbers a draft may contain. It is
// assembled entirely in code:
//   - anonymized deal facts (already rounded by anonymize.ts), each carrying
//     {deal_run_id, column, raw_value, transform} provenance;
//   - deterministic derivations (haircut DSCR, SDE gap, implied multiple),
//     computed HERE — the LLM never does arithmetic — each carrying its
//     formula and inputs;
//   - the corpus authority thresholds (editorial constants, not deal data).
// Stage 2's verify step matches every number in a generated draft against
// this sheet; an unmatched number blocks staging.
//
// Transport-ignorant: no HTTP/browser/React context.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AnonymizedFact,
  DraftMode,
  FactSheet,
  FactSheetEntry,
} from "./types";
import { displayMoney, round2sf, roundDscr, roundMultiple } from "./anonymize";

// ── Corpus authority thresholds (docs/reddit-voice-corpus.md §3.6) ──────────
// Editorial constants Steve states as fact in his posts. They are the only
// numbers a draft may use that do not come from a deal row.

export const AUTHORITY_THRESHOLDS: ReadonlyArray<{ label: string; value: number; display: string }> = [
  { label: "sba_dscr_floor", value: 1.15, display: "1.15" },
  { label: "lender_dscr_target", value: 1.25, display: "1.25" },
  { label: "comfortable_dscr", value: 1.5, display: "1.5" },
  { label: "concentration_attention_low_pct", value: 15, display: "15%" },
  { label: "concentration_attention_high_pct", value: 20, display: "20%" },
  { label: "concentration_unlendable_pct", value: 30, display: "30%" },
  { label: "dependency_multiple_compression_low_turns", value: 1, display: "1" },
  { label: "dependency_multiple_compression_high_turns", value: 2, display: "2" },
  { label: "assumed_debt_percent", value: 80, display: "80%" },
  { label: "assumed_interest_rate_pct", value: 10.5, display: "10.5%" },
  { label: "assumed_term_years", value: 10, display: "10" },
];

// ── Deterministic derivations ────────────────────────────────────────────────

export interface Derivation {
  key: string;
  value: number;
  display: string;
  qualifier: string | null;
  formula: string;
  inputs: Record<string, number>;
}

/**
 * DSCR after an SDE haircut, at the deal's recorded debt service.
 * Inputs are the RAW computed fields; the RESULT is rounded for display.
 */
export function deriveDscrAtHaircut(
  usableSde: number | null,
  monthlyPayment: number | null,
  haircutPct: number,
): Derivation | null {
  if (
    usableSde === null || monthlyPayment === null ||
    usableSde <= 0 || monthlyPayment <= 0 ||
    !isFinite(haircutPct) || haircutPct < 0 || haircutPct >= 100
  ) {
    return null;
  }
  const annualDebtService = monthlyPayment * 12;
  const raw = (usableSde * (1 - haircutPct / 100)) / annualDebtService;
  const value = roundDscr(raw);
  if (value === null) return null;
  return {
    key: `dscr_at_${haircutPct}pct_haircut`,
    value,
    display: `${value.toFixed(2)}x`,
    // Scenario framing only. The standard-terms assumption is stated ONCE
    // per post (prompt instructs it; verify.ts enforces its presence), not
    // repeated on every coverage figure.
    qualifier: `if SDE comes in ${haircutPct}% lower`,
    formula: "(usable_sde * (1 - haircut_pct/100)) / (monthly_payment * 12)",
    inputs: { usable_sde: usableSde, monthly_payment: monthlyPayment, haircut_pct: haircutPct },
  };
}

/** Dollar gap between reported and usable SDE (the add-back haircut). */
export function deriveSdeGap(
  reportedSde: number | null,
  usableSde: number | null,
): Derivation | null {
  if (
    reportedSde === null || usableSde === null ||
    reportedSde <= 0 || usableSde <= 0 || usableSde >= reportedSde
  ) {
    return null;
  }
  const rounded = round2sf(reportedSde - usableSde);
  const display = displayMoney(rounded);
  if (rounded === null || display === null) return null;
  return {
    key: "sde_gap",
    value: rounded,
    display,
    qualifier: "difference between stated SDE and what survived normalization",
    formula: "round_2sf(reported_sde - usable_sde)",
    inputs: { reported_sde: reportedSde, usable_sde: usableSde },
  };
}

/** Asking-price multiple on a given SDE basis. */
export function deriveImpliedMultiple(
  askingPrice: number | null,
  sdeBasis: number | null,
  basisLabel: "reported_sde" | "usable_sde",
): Derivation | null {
  if (askingPrice === null || sdeBasis === null || askingPrice <= 0 || sdeBasis <= 0) return null;
  const value = roundMultiple(askingPrice / sdeBasis);
  if (value === null) return null;
  return {
    key: `implied_multiple_on_${basisLabel}`,
    value,
    display: `${value.toFixed(1)}x`,
    qualifier: `asking price over ${basisLabel === "usable_sde" ? "normalized" : "stated"} SDE`,
    formula: `round_1dp(asking_price / ${basisLabel})`,
    inputs: { asking_price: askingPrice, [basisLabel]: sdeBasis },
  };
}

// ── Assembly ─────────────────────────────────────────────────────────────────

/**
 * Assembles the fact sheet for a draft. `anonymizedFacts` come from
 * anonymize.ts (single-deal or composite emitters); `derivations` from the
 * derive* functions above; `dealRunIds` are the source deals for provenance.
 * Every entry carries provenance — an entry without provenance cannot exist.
 */
export function buildFactSheet(args: {
  mode: DraftMode;
  dealRunIds: string[];
  anonymizedFacts: AnonymizedFact[];
  derivations?: Derivation[];
}): FactSheet {
  const { mode, dealRunIds, anonymizedFacts, derivations = [] } = args;
  const entries: FactSheetEntry[] = [];

  for (const fact of anonymizedFacts) {
    const numeric = typeof fact.value === "number" ? fact.value : null;
    entries.push({
      key: fact.key,
      display: fact.display,
      value: numeric,
      qualifier: fact.qualifier,
      provenance:
        mode === "composite" && fact.transform.startsWith("median_")
          ? {
              kind: "composite_aggregate",
              statistic: "median",
              column: fact.key.replace(/^median_/, ""),
              deal_run_ids: dealRunIds,
              transform: fact.transform,
            }
          : mode === "composite" && fact.transform === "count"
            ? {
                kind: "composite_aggregate",
                statistic: "count",
                column: "deal_run_id",
                deal_run_ids: dealRunIds,
                transform: fact.transform,
              }
            : {
                kind: "deal_field",
                deal_run_id: dealRunIds[0] ?? "",
                column: fact.key,
                raw_value: fact.value,
                transform: fact.transform,
              },
    });
  }

  for (const d of derivations) {
    entries.push({
      key: d.key,
      display: d.display,
      value: d.value,
      qualifier: d.qualifier,
      provenance: {
        kind: "derived",
        formula: d.formula,
        inputs: d.inputs,
        deal_run_ids: dealRunIds,
      },
    });
  }

  for (const t of AUTHORITY_THRESHOLDS) {
    entries.push({
      key: `threshold_${t.label}`,
      display: t.display,
      value: t.value,
      qualifier: null,
      provenance: { kind: "corpus_constant", label: t.label },
    });
  }

  return { built_at: new Date().toISOString(), mode, entries };
}
