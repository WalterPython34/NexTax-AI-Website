// lib/sbaEstimator.ts
// SBA 7(a) loan estimator — deterministic math, no external APIs.
// Always uses usableSDE (normalized), never raw SDE.

export interface SbaInputs {
  askingPrice:      number;
  usableSde:        number;        // normalized earnings — never raw SDE
  downPaymentPct?:  number;        // default 10 (SBA minimum)
  interestRate?:    number;        // annual %, default 10.75 (prime + 2.75)
  termYears?:       number;        // default 10
}

export interface SbaOutputs {
  loanAmount:         number;
  downPayment:        number;
  monthlyPayment:     number;
  annualDebtService:  number;
  dscr:               number;
  eligible:           boolean;      // dscr >= 1.25 and price <= 5M
  eligibilityNote:    string;
  // Sensitivity scenarios
  stressedDscr15:     number;       // at −15% usableSDE
  stressedDscr25:     number;       // at −25% usableSDE
}

export function estimateSbaLoan(inputs: SbaInputs): SbaOutputs {
  const {
    askingPrice,
    usableSde,
    downPaymentPct  = 10,
    interestRate    = 10.75,
    termYears       = 10,
  } = inputs;

  const downFraction   = Math.min(Math.max(downPaymentPct, 10), 50) / 100;
  const downPayment    = Math.round(askingPrice * downFraction);
  const loanAmount     = askingPrice - downPayment;

  // Standard amortization formula: M = P[r(1+r)^n]/[(1+r)^n−1]
  const monthlyRate    = interestRate / 100 / 12;
  const numPayments    = termYears * 12;
  const monthlyPayment = loanAmount > 0 && monthlyRate > 0
    ? Math.round(loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))
        / (Math.pow(1 + monthlyRate, numPayments) - 1))
    : 0;

  const annualDebtService = monthlyPayment * 12;
  const dscr = annualDebtService > 0 ? +(usableSde / annualDebtService).toFixed(2) : 0;

  // SBA 7(a) eligibility checks
  const meetsSize  = askingPrice <= 5_000_000;
  const meetsDscr  = dscr >= 1.25;
  const eligible   = meetsSize && meetsDscr;

  const eligibilityNote =
    !meetsSize  ? `Asking price exceeds $5M SBA 7(a) limit. Consider conventional financing.`
    : !meetsDscr ? `DSCR of ${dscr.toFixed(2)}x is below the 1.25x SBA minimum. Consider higher down payment or seller note to bridge gap.`
    :              `DSCR of ${dscr.toFixed(2)}x meets SBA 7(a) requirements at ${interestRate}% over ${termYears} years.`;

  // Stress scenarios — use usableSDE as the base (never raw)
  const stressedDscr15 = annualDebtService > 0
    ? +((usableSde * 0.85) / annualDebtService).toFixed(2) : 0;
  const stressedDscr25 = annualDebtService > 0
    ? +((usableSde * 0.75) / annualDebtService).toFixed(2) : 0;

  return {
    loanAmount,
    downPayment,
    monthlyPayment,
    annualDebtService,
    dscr,
    eligible,
    eligibilityNote,
    stressedDscr15,
    stressedDscr25,
  };
}

/*
// WIRING — SBA tab in UnderwritingPanel already uses its own local math.
// To switch it to use estimateSbaLoan(), replace the sba* consts with:

import { estimateSbaLoan } from "@/lib/sbaEstimator";

const sbaEst = estimateSbaLoan({
  askingPrice: deal.asking_price,
  usableSde:   usableSDE,           // always the trust-gated value
  downPaymentPct: 10,
  interestRate: 10.75,
  termYears: 10,
});

// Then use sbaEst.monthlyPayment, sbaEst.dscr, sbaEst.eligible, etc.
// The stressedDscr15 / stressedDscr25 values can replace the existing
// stressDscr15 / stressDscr25 calculations in the Stress Test tab.
*/
