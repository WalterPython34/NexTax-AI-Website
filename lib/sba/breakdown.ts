import { LENDER_COMFORT, type ConfidenceBlock, type SbaVerdict, type VerdictZone } from "./sba-engine";
import { ZONE_HEADLINE } from "./zone-copy";

export type LineBasis = "input" | "benchmark" | "derived" | "policy";
export type LineKind = "money" | "ratio" | "moneyRange" | "ratioRange";

export interface BreakdownLineItem {
  id: string;
  label: string;
  basis: LineBasis;
  kind: LineKind;
  value?: number;
  low?: number;
  high?: number;
  note?: string;
}

export interface Interpretation {
  killLine: string;
  source: "llm" | "template";
  model?: string;
}

export interface SbaBreakdown {
  zone: VerdictZone;
  zoneHeadline: string;
  verdictConfidence: ConfidenceBlock;
  inputConfidence: ConfidenceBlock;
  buyerCaseDscr: number;
  lenderDscrLow: number;
  lenderDscrHigh: number;
  ownerCompLabel: string;
  lineItems: BreakdownLineItem[];
  interpretation: Interpretation;
  disclaimer: string;
  version: string;
}

const OWNER_COMP_LABEL = "benchmark owner replacement cost";

function ownerCompNote(v: SbaVerdict): string {
  const oc = v.ownerComp;
  if (oc.provenance === "assumption") return "your assumption";
  const bits = [oc.occupationLabel, oc.percentile ? `p${oc.percentile}` : undefined, oc.release]
    .filter(Boolean);
  return bits.length ? bits.join(" \u00b7 ") : "benchmark-derived";
}

function addbackNote(v: SbaVerdict): string {
  if (!v.addbackBand.marginAvailable) {
    return "No industry margin median available, so the add-back band was widened.";
  }
  if (v.medianMargin === null) return "Add-back band from reported margin.";
  const premium = v.reportedMargin / v.medianMargin;
  if (premium <= 1.2) return "Reported margin near the peer median: little add-back headroom credited.";
  if (premium <= 2.0) return "Reported margin above peers: a moderate add-back band applies.";
  return "Reported margin well above peers: a wider add-back band applies.";
}

function debtServiceNote(v: SbaVerdict): string {
  return `Loan ${money(v.loanAmount)} amortized to ${money(v.monthlyPayment)}/mo.`;
}

function money(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

/** Deterministic per-zone kill-line. Uses only whitelisted numbers (DSCR range, 1.25). */
export function templateKillLine(v: SbaVerdict): string {
  const range = `${v.lenderDscrLow}\u2013${v.lenderDscrHigh}\u00d7`;
  const line = LENDER_COMFORT + "\u00d7";
  switch (v.zone) {
    case "PASS":
      return `The lender-view DSCR range of ${range} sits at or above the ${line} line, so this deal clears the screen on the numbers shown.`;
    case "FAIL":
      return `The lender-view DSCR range of ${range} falls below the ${line} line, so this deal does not clear the screen on the numbers shown.`;
    case "BUBBLE":
      return `The lender-view DSCR range of ${range} straddles the ${line} line, so clearing it depends on how much of the add-backs can be documented.`;
  }
}

export interface BuildBreakdownOptions {
  disclaimer: string;
  version: string;
  interpretation?: Interpretation; // when omitted, the deterministic template is used
}

export function buildBreakdown(v: SbaVerdict, opts: BuildBreakdownOptions): SbaBreakdown {
  const lineItems: BreakdownLineItem[] = [
    { id: "reported_sde", label: "Seller's reported SDE", basis: "input", kind: "money", value: v.lenderStart + v.ownerComp.value },
    { id: "owner_replacement_cost", label: OWNER_COMP_LABEL, basis: v.ownerComp.provenance === "benchmark" ? "benchmark" : "input", kind: "money", value: v.ownerComp.value, note: ownerCompNote(v) },
    { id: "lender_start", label: "Lender-view starting SDE", basis: "derived", kind: "money", value: v.lenderStart },
    { id: "addback_band", label: "Add-backs a lender may credit", basis: "derived", kind: "moneyRange", low: v.addbackBand.low, high: v.addbackBand.high, note: addbackNote(v) },
    { id: "lender_sde_range", label: "Lender-view SDE range", basis: "derived", kind: "moneyRange", low: v.lenderSdeLow, high: v.lenderSdeHigh },
    { id: "annual_debt_service", label: "Annual debt service", basis: "derived", kind: "money", value: v.annualDebtService, note: debtServiceNote(v) },
    { id: "lender_dscr_range", label: "Lender-view DSCR range", basis: "derived", kind: "ratioRange", low: v.lenderDscrLow, high: v.lenderDscrHigh },
    { id: "lender_threshold", label: "Lender comfort line", basis: "policy", kind: "ratio", value: LENDER_COMFORT, note: "Standard 1.25\u00d7 SBA lender screen." },
    { id: "buyer_case_dscr", label: "Buyer-case DSCR", basis: "derived", kind: "ratio", value: v.buyerCaseDscr, note: "Before lender add-back adjustments." },
  ];

  const interpretation: Interpretation =
    opts.interpretation ?? { killLine: templateKillLine(v), source: "template" };

  return {
    zone: v.zone,
    zoneHeadline: ZONE_HEADLINE[v.zone],
    verdictConfidence: v.verdictConfidence,
    inputConfidence: v.inputConfidence,
    buyerCaseDscr: v.buyerCaseDscr,
    lenderDscrLow: v.lenderDscrLow,
    lenderDscrHigh: v.lenderDscrHigh,
    ownerCompLabel: OWNER_COMP_LABEL,
    lineItems,
    interpretation,
    disclaimer: opts.disclaimer,
    version: opts.version,
  };
}
