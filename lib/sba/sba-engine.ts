import type { OwnerComp, OwnerCompProvenance } from "./owner-comp-provider";

export const SBA_FLOOR = 1.15;
export const LENDER_COMFORT = 1.25;
export const STRONG = 1.5;

const THIN_CUSHION = 0.1;

export const ADDBACK_COEFFICIENTS = {
  nearPeers: { maxPremium: 1.2, low: 0.0, high: 0.05 },
  moderate: { maxPremium: 2.0, low: 0.05, high: 0.15 },
  high: { low: 0.1, high: 0.25 },
} as const;

export type VerdictZone = "PASS" | "FAIL" | "BUBBLE";
export type Confidence = "High" | "Medium" | "Low";
export type InputSource = "stated" | "extracted" | "estimated" | "inferred";

const SOURCE_WEIGHT: Record<InputSource, number> = {
  stated: 3,
  extracted: 2,
  estimated: 1,
  inferred: 1,
};

export interface InputProvenance {
  revenue: InputSource;
  sde: InputSource;
  industry: InputSource;
}

const DEFAULT_PROVENANCE: InputProvenance = {
  revenue: "stated",
  sde: "stated",
  industry: "stated",
};

export interface SbaInputs {
  reportedSde: number;
  annualRevenue: number;
  askingPrice: number;
  debtPercent: number;
  ratePercent: number;
  termYears: number;
  ownerComp: OwnerComp;
  medianMargin: number | null;
  provenance?: InputProvenance;
}

export interface AddbackBand {
  low: number;
  high: number;
  marginAvailable: boolean;
}

export interface ConfidenceBlock {
  level: Confidence;
  reasons: string[];
}

export interface SbaVerdict {
  zone: VerdictZone;
  verdictConfidence: ConfidenceBlock;
  inputConfidence: ConfidenceBlock;
  buyerCaseDscr: number;
  lenderDscrLow: number;
  lenderDscrHigh: number;
  lenderStart: number;
  lenderSdeLow: number;
  lenderSdeHigh: number;
  ownerComp: OwnerComp;
  addbackBand: AddbackBand;
  reportedMargin: number;
  medianMargin: number | null;
  annualDebtService: number;
  monthlyPayment: number;
  loanAmount: number;
}

export type SbaResult =
  | { ok: true; verdict: SbaVerdict }
  | { ok: false; reason: string };

function roundMoney(n: number): number {
  return Math.round(n);
}

function roundRatio(n: number): number {
  return Math.round(n * 100) / 100;
}

export function amortizedAnnualDebtService(
  loanAmount: number,
  ratePercent: number,
  termYears: number,
): number {
  const n = termYears * 12;
  const monthlyRate = ratePercent / 100 / 12;
  const monthlyPayment =
    monthlyRate > 0
      ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, n)) /
        (Math.pow(1 + monthlyRate, n) - 1)
      : loanAmount / n;
  return monthlyPayment * 12;
}

export function addbackBand(
  lenderStart: number,
  reportedMargin: number,
  medianMargin: number | null,
): AddbackBand {
  const usable =
    medianMargin !== null && medianMargin > 0 && reportedMargin > 0;

  if (!usable) {
    return {
      low: lenderStart * ADDBACK_COEFFICIENTS.high.low,
      high: lenderStart * ADDBACK_COEFFICIENTS.high.high,
      marginAvailable: false,
    };
  }

  const premium = reportedMargin / medianMargin;
  const tier =
    premium <= ADDBACK_COEFFICIENTS.nearPeers.maxPremium
      ? ADDBACK_COEFFICIENTS.nearPeers
      : premium <= ADDBACK_COEFFICIENTS.moderate.maxPremium
        ? ADDBACK_COEFFICIENTS.moderate
        : ADDBACK_COEFFICIENTS.high;

  return {
    low: lenderStart * tier.low,
    high: lenderStart * tier.high,
    marginAvailable: true,
  };
}

export function classifyZone(
  lenderDscrLow: number,
  lenderDscrHigh: number,
): VerdictZone {
  if (lenderDscrLow >= LENDER_COMFORT) return "PASS";
  if (lenderDscrHigh < LENDER_COMFORT) return "FAIL";
  return "BUBBLE";
}

function gradeVerdictConfidence(
  zone: VerdictZone,
  lenderDscrLow: number,
  lenderDscrHigh: number,
): ConfidenceBlock {
  if (zone === "BUBBLE") {
    return {
      level: "Low",
      reasons: [
        "The range straddles the 1.25x lender minimum — the verdict depends on how add-backs are documented.",
      ],
    };
  }

  const cushion =
    zone === "PASS"
      ? lenderDscrLow - LENDER_COMFORT
      : LENDER_COMFORT - lenderDscrHigh;

  if (cushion < THIN_CUSHION) {
    return {
      level: "Medium",
      reasons: [
        "The verdict is clear but the cushion above the 1.25x line is thin — small revisions could move it.",
      ],
    };
  }

  return {
    level: "High",
    reasons: ["The range sits fully on one side of the 1.25x line."],
  };
}

function fieldReason(label: string, source: InputSource): string | null {
  if (source === "extracted") return `${label} was read from the listing rather than confirmed.`;
  if (source === "estimated") return `${label} was estimated, not a stated figure.`;
  if (source === "inferred") return `${label} was inferred rather than confirmed.`;
  return null;
}

function gradeInputConfidence(
  provenance: InputProvenance,
  ownerComp: OwnerComp,
  marginAvailable: boolean,
): ConfidenceBlock {
  const groundingWeight = ownerComp.groundingStrength === "full" ? 3 : 2;
  const marginWeight = marginAvailable ? 3 : 2;

  const score = Math.min(
    SOURCE_WEIGHT[provenance.revenue],
    SOURCE_WEIGHT[provenance.sde],
    SOURCE_WEIGHT[provenance.industry],
    groundingWeight,
    marginWeight,
  );

  const reasons: string[] = [];
  const fields: [string, InputSource][] = [
    ["Revenue", provenance.revenue],
    ["SDE", provenance.sde],
    ["Industry", provenance.industry],
  ];
  for (const [label, source] of fields) {
    const reason = fieldReason(label, source);
    if (reason) reasons.push(reason);
  }
  if (ownerComp.groundingStrength !== "full") {
    reasons.push(
      ownerComp.groundingNote ??
        "Owner compensation is not from an industry-specific benchmark.",
    );
  }
  if (!marginAvailable) {
    reasons.push("No industry margin median was available, so the add-back band was widened.");
  }

  const level: Confidence = score >= 3 ? "High" : score === 2 ? "Medium" : "Low";
  if (reasons.length === 0) {
    reasons.push("Revenue, SDE, and industry are stated figures with benchmark-grounded inputs.");
  }

  return { level, reasons };
}

export function evaluateSba(inputs: SbaInputs): SbaResult {
  const {
    reportedSde,
    annualRevenue,
    askingPrice,
    debtPercent,
    ratePercent,
    termYears,
    ownerComp,
    medianMargin,
  } = inputs;
  const provenance = inputs.provenance ?? DEFAULT_PROVENANCE;

  if (!(reportedSde > 0)) {
    return { ok: false, reason: "Enter the seller's reported SDE to run a check." };
  }
  if (!(annualRevenue > 0)) {
    return { ok: false, reason: "Enter annual revenue to size the add-back band." };
  }
  if (!(askingPrice > 0)) {
    return { ok: false, reason: "Enter an asking price to size the loan." };
  }
  if (!(termYears > 0)) {
    return { ok: false, reason: "Enter a loan term greater than zero." };
  }
  if (debtPercent <= 0) {
    return {
      ok: false,
      reason: "With no debt, there is no lender test to run. Enter a financed percentage.",
    };
  }

  const loanAmount = askingPrice * (debtPercent / 100);
  const annualDebtService = amortizedAnnualDebtService(
    loanAmount,
    ratePercent,
    termYears,
  );

  if (!(annualDebtService > 0)) {
    return {
      ok: false,
      reason: "The financing terms produce no debt service to test against.",
    };
  }

  const monthlyPayment = annualDebtService / 12;
  const buyerCaseDscrRaw = reportedSde / annualDebtService;

  const lenderStart = reportedSde - ownerComp.value;
  const reportedMargin = reportedSde / annualRevenue;
  const band = addbackBand(lenderStart, reportedMargin, medianMargin);

  const lenderSdeHigh = lenderStart - band.low;
  const lenderSdeLow = lenderStart - band.high;
  const lenderDscrLowRaw = lenderSdeLow / annualDebtService;
  const lenderDscrHighRaw = lenderSdeHigh / annualDebtService;

  const zone = classifyZone(lenderDscrLowRaw, lenderDscrHighRaw);
  const verdictConfidence = gradeVerdictConfidence(
    zone,
    lenderDscrLowRaw,
    lenderDscrHighRaw,
  );
  const inputConfidence = gradeInputConfidence(
    provenance,
    ownerComp,
    band.marginAvailable,
  );

  return {
    ok: true,
    verdict: {
      zone,
      verdictConfidence,
      inputConfidence,
      buyerCaseDscr: roundRatio(buyerCaseDscrRaw),
      lenderDscrLow: roundRatio(lenderDscrLowRaw),
      lenderDscrHigh: roundRatio(lenderDscrHighRaw),
      lenderStart: roundMoney(lenderStart),
      lenderSdeLow: roundMoney(lenderSdeLow),
      lenderSdeHigh: roundMoney(lenderSdeHigh),
      ownerComp,
      addbackBand: {
        low: roundMoney(band.low),
        high: roundMoney(band.high),
        marginAvailable: band.marginAvailable,
      },
      reportedMargin: roundRatio(reportedMargin),
      medianMargin: medianMargin === null ? null : roundRatio(medianMargin),
      annualDebtService: roundMoney(annualDebtService),
      monthlyPayment: roundMoney(monthlyPayment),
      loanAmount: roundMoney(loanAmount),
    },
  };
}

export interface InterpretationPayload {
  zone: VerdictZone;
  verdictConfidence: Confidence;
  inputConfidence: Confidence;
  buyerCaseDscr: number;
  lenderDscrLow: number;
  lenderDscrHigh: number;
  ownerComp: number;
  ownerCompProvenance: OwnerCompProvenance;
  addbackLow: number;
  addbackHigh: number;
  reportedMargin: number;
  medianMargin: number | null;
}

export function buildInterpretationPayload(verdict: SbaVerdict): InterpretationPayload {
  return {
    zone: verdict.zone,
    verdictConfidence: verdict.verdictConfidence.level,
    inputConfidence: verdict.inputConfidence.level,
    buyerCaseDscr: verdict.buyerCaseDscr,
    lenderDscrLow: verdict.lenderDscrLow,
    lenderDscrHigh: verdict.lenderDscrHigh,
    ownerComp: verdict.ownerComp.value,
    ownerCompProvenance: verdict.ownerComp.provenance,
    addbackLow: verdict.addbackBand.low,
    addbackHigh: verdict.addbackBand.high,
    reportedMargin: verdict.reportedMargin,
    medianMargin: verdict.medianMargin,
  };
}
