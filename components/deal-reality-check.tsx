"use client";

import React, { useState, useRef } from "react";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface DealInputs {
  revenue: string; sde: string; askingPrice: string; industry: string;
  debtPercent: string; interestRate: string; loanTermYears: string;
}

interface ScoreBreakdown {
  overall: number;
  valuation: {
    score: number; multiple: number; marketRange: [number, number];
    fairValue: number; fairValueLow: number; fairValueHigh: number;
    rangePosition: "Below Range" | "Within Range" | "Above Range";
    recommendedOffer: [number, number]; verdict: string;
    benchmarkSource: string; sampleSize: number;
  };
  debtRisk: { score: number; dscr: number; annualPayment: number; monthlyPayment: number; verdict: string };
  marketRisk: { score: number; industryGrowth: string; verdict: string };
  industryRisk: { score: number; marginRange: [number, number]; verdict: string };
  marketIntel: { demandLevel: string; buyerInterestRank: number; competitionLevel: string; demandScore: number };
  communityComparison: { avgScore: number; topScore: number; lowestScore: number; percentile: number; totalDeals: number };
  redFlags: string[]; greenFlags: string[];
  riskLevel: "Low" | "Moderate" | "High" | "Critical";
  aiInsight: string | null;
  dealMemo: DealMemo | null;
  nextStep: "advance" | "validate" | "reprice";
  threeLens?: {
    listing: { medianMultiple: number; sampleSize: number } | null;
    transaction: { cashflowMultiple: number; saleToAskRatio: number; daysOnMarket: number; reportedSales: number; subsector: string } | null;
    financial: { sdeMargin: number } | null;
    sellerBuyerGap: number | null;
    estimatedNegotiatedPrice: number | null;
    smartOfferRange: [number, number];
    confidence: {
      overall: string;
      listing: { grade: string; description: string; sampleSize: number };
      transaction: { grade: string; description: string; sampleSize: number };
      financial: { grade: string; description: string; sampleSize: number };
      weights: { valuation: number; debt: number; financial: number; liquidity: number };
    };
  };
}

interface DealMemo {
  positioning: {
    marketPosition: string;
    buyerFit: string;
    executionDifficulty: string;
    negotiationLeverage: string;
  };
  whatMustBeTrue: string[];
  decisionPath: {
    steps: string[];
    ifValidated: string;
    ifNot: string;
  };
  negotiationPlaybook: {
    anchorRange: string;
    structureIdeas: string[];
    walkAway: string;
  };
  dealBreakers: string[];
  confidenceNote: string;
  pricingContext: string;
  businessQuality: string;
  buyerInterpretation: string;
}

// ─── INDUSTRY DATA ────────────────────────────────────────────────────────────

const INDUSTRIES: Record<string, {
  label: string; typicalMultiple: [number, number];
  benchmarkLow: number; benchmarkMid: number; benchmarkHigh: number;
  marginRange: [number, number]; growth: string; riskFactor: number;
  demandScore: number; buyerInterestRank: number; competitionLevel: string;
  sampleSize: number; benchmarkSource: string;
}> = {
  laundromat:     { label:"Laundromat",             typicalMultiple:[2.5,4.0], benchmarkLow:2.8, benchmarkMid:3.48, benchmarkHigh:4.4,  marginRange:[25,40], growth:"Stable",   riskFactor:0.85, demandScore:82, buyerInterestRank:3,  competitionLevel:"Moderate",       sampleSize:112, benchmarkSource:"DealStats" },
  hvac:           { label:"HVAC",                   typicalMultiple:[2.5,4.5], benchmarkLow:1.8, benchmarkMid:2.45, benchmarkHigh:3.2,  marginRange:[15,30], growth:"Growing",  riskFactor:0.75, demandScore:88, buyerInterestRank:2,  competitionLevel:"Low-Moderate",   sampleSize:312, benchmarkSource:"DealStats" },
  landscaping:    { label:"Landscaping",            typicalMultiple:[1.5,3.0], benchmarkLow:1.7, benchmarkMid:2.21, benchmarkHigh:2.9,  marginRange:[10,25], growth:"Stable",   riskFactor:0.90, demandScore:70, buyerInterestRank:7,  competitionLevel:"High",           sampleSize:189, benchmarkSource:"DealStats" },
  carwash:        { label:"Car Wash",               typicalMultiple:[3.0,5.0], benchmarkLow:2.0, benchmarkMid:2.74, benchmarkHigh:3.6,  marginRange:[25,45], growth:"Growing",  riskFactor:0.80, demandScore:79, buyerInterestRank:5,  competitionLevel:"Moderate",       sampleSize:98,  benchmarkSource:"DealStats" },
  dental:         { label:"Dental Practice",        typicalMultiple:[3.0,5.5], benchmarkLow:0.8, benchmarkMid:1.30, benchmarkHigh:1.9,  marginRange:[20,40], growth:"Growing",  riskFactor:0.65, demandScore:74, buyerInterestRank:8,  competitionLevel:"Low",            sampleSize:167, benchmarkSource:"DealStats" },
  gym:            { label:"Gym / Fitness Center",   typicalMultiple:[2.0,4.0], benchmarkLow:1.8, benchmarkMid:2.32, benchmarkHigh:3.0,  marginRange:[15,35], growth:"Stable",   riskFactor:0.95, demandScore:71, buyerInterestRank:9,  competitionLevel:"Moderate-High",  sampleSize:178, benchmarkSource:"DealStats" },
  restaurant:     { label:"Restaurant",             typicalMultiple:[1.5,3.0], benchmarkLow:1.4, benchmarkMid:1.85, benchmarkHigh:2.4,  marginRange:[5,15],  growth:"Volatile", riskFactor:1.10, demandScore:65, buyerInterestRank:11, competitionLevel:"Very High",      sampleSize:892, benchmarkSource:"DealStats" },
  autorepair:     { label:"Auto Repair",            typicalMultiple:[2.0,3.5], benchmarkLow:1.6, benchmarkMid:2.11, benchmarkHigh:2.8,  marginRange:[15,30], growth:"Stable",   riskFactor:0.85, demandScore:73, buyerInterestRank:6,  competitionLevel:"Moderate",       sampleSize:445, benchmarkSource:"DealStats" },
  cleaning:       { label:"Cleaning Service",       typicalMultiple:[1.5,3.0], benchmarkLow:1.8, benchmarkMid:2.22, benchmarkHigh:2.9,  marginRange:[15,30], growth:"Growing",  riskFactor:0.80, demandScore:76, buyerInterestRank:4,  competitionLevel:"High",           sampleSize:267, benchmarkSource:"DealStats" },
  ecommerce:      { label:"Ecommerce Brand",        typicalMultiple:[2.5,4.5], benchmarkLow:1.9, benchmarkMid:2.41, benchmarkHigh:3.1,  marginRange:[15,35], growth:"Variable", riskFactor:0.95, demandScore:83, buyerInterestRank:1,  competitionLevel:"Very High",      sampleSize:345, benchmarkSource:"DealStats" },
  saas:           { label:"SaaS Product",           typicalMultiple:[3.0,6.0], benchmarkLow:2.1, benchmarkMid:2.60, benchmarkHigh:3.4,  marginRange:[60,85], growth:"Growing",  riskFactor:0.70, demandScore:91, buyerInterestRank:1,  competitionLevel:"High",           sampleSize:156, benchmarkSource:"DealStats" },
  insurance:      { label:"Insurance Agency",       typicalMultiple:[2.0,3.5], benchmarkLow:1.4, benchmarkMid:1.82, benchmarkHigh:2.4,  marginRange:[20,40], growth:"Stable",   riskFactor:0.70, demandScore:68, buyerInterestRank:10, competitionLevel:"Low",            sampleSize:89,  benchmarkSource:"DealStats" },
  plumbing:       { label:"Plumbing",               typicalMultiple:[2.0,4.0], benchmarkLow:1.7, benchmarkMid:2.30, benchmarkHigh:3.0,  marginRange:[15,30], growth:"Growing",  riskFactor:0.75, demandScore:85, buyerInterestRank:3,  competitionLevel:"Low-Moderate",   sampleSize:198, benchmarkSource:"DealStats" },
  roofing:        { label:"Roofing",                typicalMultiple:[1.5,3.5], benchmarkLow:1.7, benchmarkMid:2.21, benchmarkHigh:2.9,  marginRange:[15,30], growth:"Stable",   riskFactor:0.90, demandScore:72, buyerInterestRank:6,  competitionLevel:"Moderate",       sampleSize:134, benchmarkSource:"DealStats" },
  petcare:        { label:"Pet Care / Grooming",    typicalMultiple:[2.0,4.0], benchmarkLow:2.0, benchmarkMid:2.46, benchmarkHigh:3.2,  marginRange:[20,40], growth:"Growing",  riskFactor:0.80, demandScore:77, buyerInterestRank:5,  competitionLevel:"Moderate",       sampleSize:223, benchmarkSource:"DealStats" },
  pharmacy:       { label:"Pharmacy",               typicalMultiple:[2.5,4.0], benchmarkLow:0.5, benchmarkMid:0.66, benchmarkHigh:0.9,  marginRange:[18,30], growth:"Stable",   riskFactor:0.75, demandScore:62, buyerInterestRank:14, competitionLevel:"Low",            sampleSize:67,  benchmarkSource:"DealStats" },
  daycare:        { label:"Daycare / Childcare",    typicalMultiple:[2.0,4.0], benchmarkLow:1.9, benchmarkMid:2.29, benchmarkHigh:3.0,  marginRange:[15,30], growth:"Growing",  riskFactor:0.80, demandScore:74, buyerInterestRank:10, competitionLevel:"Moderate",       sampleSize:134, benchmarkSource:"DealStats" },
  medspa:         { label:"Med Spa / Aesthetics",   typicalMultiple:[3.0,5.0], benchmarkLow:2.0, benchmarkMid:2.75, benchmarkHigh:3.6,  marginRange:[25,45], growth:"Growing",  riskFactor:0.75, demandScore:80, buyerInterestRank:7,  competitionLevel:"Moderate",       sampleSize:89,  benchmarkSource:"DealStats" },
  accounting:     { label:"Accounting / Tax Firm",  typicalMultiple:[1.5,3.5], benchmarkLow:1.0, benchmarkMid:1.30, benchmarkHigh:1.7,  marginRange:[30,55], growth:"Stable",   riskFactor:0.60, demandScore:86, buyerInterestRank:3,  competitionLevel:"Low-Moderate",   sampleSize:134, benchmarkSource:"DealStats" },
  electrical:     { label:"Electrical Contractor",  typicalMultiple:[2.0,4.0], benchmarkLow:1.8, benchmarkMid:2.40, benchmarkHigh:3.1,  marginRange:[15,30], growth:"Growing",  riskFactor:0.75, demandScore:82, buyerInterestRank:5,  competitionLevel:"Low-Moderate",   sampleSize:156, benchmarkSource:"DealStats" },
  healthcare:     { label:"Healthcare / Home Health",typicalMultiple:[3.0,6.0], benchmarkLow:1.1, benchmarkMid:1.72, benchmarkHigh:2.3,  marginRange:[15,35], growth:"Growing",  riskFactor:0.70, demandScore:79, buyerInterestRank:6,  competitionLevel:"Moderate",       sampleSize:145, benchmarkSource:"DealStats" },
  transportation: { label:"Transportation / Trucking",typicalMultiple:[2.0,4.0],benchmarkLow:2.0, benchmarkMid:2.65, benchmarkHigh:3.4,  marginRange:[10,25], growth:"Stable",   riskFactor:0.85, demandScore:68, buyerInterestRank:11, competitionLevel:"Moderate",       sampleSize:112, benchmarkSource:"DealStats" },
  printing:       { label:"Printing / Marketing",   typicalMultiple:[1.5,3.0], benchmarkLow:1.4, benchmarkMid:1.90, benchmarkHigh:2.5,  marginRange:[15,30], growth:"Variable", riskFactor:0.90, demandScore:55, buyerInterestRank:18, competitionLevel:"High",           sampleSize:78,  benchmarkSource:"DealStats" },
  storage:        { label:"Self-Storage",           typicalMultiple:[4.0,8.0], benchmarkLow:4.0, benchmarkMid:5.50, benchmarkHigh:7.2,  marginRange:[40,65], growth:"Growing",  riskFactor:0.60, demandScore:84, buyerInterestRank:4,  competitionLevel:"Moderate",       sampleSize:56,  benchmarkSource:"DealStats" },
  painting:       { label:"Painting Contractor",    typicalMultiple:[1.5,3.0], benchmarkLow:1.6, benchmarkMid:2.05, benchmarkHigh:2.7,  marginRange:[15,30], growth:"Stable",   riskFactor:0.90, demandScore:64, buyerInterestRank:15, competitionLevel:"High",           sampleSize:112, benchmarkSource:"DealStats" },
  security:       { label:"Security Services",      typicalMultiple:[2.5,4.5], benchmarkLow:1.4, benchmarkMid:1.94, benchmarkHigh:2.6,  marginRange:[15,30], growth:"Growing",  riskFactor:0.75, demandScore:72, buyerInterestRank:9,  competitionLevel:"Low-Moderate",   sampleSize:89,  benchmarkSource:"DealStats" },
  construction:    { label:"Other Construction",              typicalMultiple:[1.8,3.2], benchmarkLow:1.81, benchmarkMid:2.4,  benchmarkHigh:3.17, marginRange:[15,30], growth:"Stable",   riskFactor:0.88, demandScore:72, buyerInterestRank:8,  competitionLevel:"Moderate",      sampleSize:323, benchmarkSource:"DealStats" },
  engineering:     { label:"Engineering Services",            typicalMultiple:[1.8,3.3], benchmarkLow:1.82, benchmarkMid:2.43, benchmarkHigh:3.34, marginRange:[20,40], growth:"Growing",  riskFactor:0.70, demandScore:78, buyerInterestRank:6,  competitionLevel:"Low-Moderate",  sampleSize:165, benchmarkSource:"DealStats" },
  grocery:         { label:"Grocery Store",                   typicalMultiple:[1.6,3.3], benchmarkLow:1.57, benchmarkMid:2.27, benchmarkHigh:3.3,  marginRange:[10,15], growth:"Stable",   riskFactor:0.95, demandScore:60, buyerInterestRank:14, competitionLevel:"High",          sampleSize:97,  benchmarkSource:"DealStats" },
  hairsalon:       { label:"Hair Salon",                      typicalMultiple:[1.1,2.3], benchmarkLow:1.11, benchmarkMid:1.61, benchmarkHigh:2.33, marginRange:[15,30], growth:"Stable",   riskFactor:0.92, demandScore:65, buyerInterestRank:12, competitionLevel:"Very High",     sampleSize:420, benchmarkSource:"DealStats" },
  marketing:       { label:"Marketing Agency",                typicalMultiple:[1.8,3.1], benchmarkLow:1.8,  benchmarkMid:2.27, benchmarkHigh:3.15, marginRange:[20,35], growth:"Growing",  riskFactor:0.80, demandScore:75, buyerInterestRank:7,  competitionLevel:"High",          sampleSize:93,  benchmarkSource:"DealStats" },
  pestcontrol:     { label:"Pest Control",                    typicalMultiple:[2.0,4.2], benchmarkLow:2.02, benchmarkMid:3.19, benchmarkHigh:4.24, marginRange:[20,35], growth:"Growing",  riskFactor:0.75, demandScore:80, buyerInterestRank:5,  competitionLevel:"Moderate",      sampleSize:128, benchmarkSource:"DealStats" },
  physicaltherapy: { label:"Physical Therapy / Chiropractic", typicalMultiple:[1.6,2.9], benchmarkLow:1.59, benchmarkMid:2.16, benchmarkHigh:2.9,  marginRange:[20,35], growth:"Growing",  riskFactor:0.72, demandScore:76, buyerInterestRank:7,  competitionLevel:"Moderate",      sampleSize:107, benchmarkSource:"DealStats" },
  propertymanage:  { label:"Property Management",             typicalMultiple:[1.9,3.1], benchmarkLow:1.86, benchmarkMid:2.38, benchmarkHigh:3.08, marginRange:[20,40], growth:"Growing",  riskFactor:0.72, demandScore:79, buyerInterestRank:5,  competitionLevel:"Moderate",      sampleSize:365, benchmarkSource:"DealStats" },
  realestatebrok:  { label:"Real Estate Brokerage",           typicalMultiple:[1.7,2.6], benchmarkLow:1.66, benchmarkMid:2.08, benchmarkHigh:2.58, marginRange:[15,30], growth:"Variable", riskFactor:0.90, demandScore:62, buyerInterestRank:13, competitionLevel:"High",          sampleSize:39,  benchmarkSource:"DealStats" },
  remodeling:      { label:"Home Remodeling & Restoration",   typicalMultiple:[1.4,2.7], benchmarkLow:1.42, benchmarkMid:2.08, benchmarkHigh:2.74, marginRange:[15,25], growth:"Stable",   riskFactor:0.88, demandScore:70, buyerInterestRank:9,  competitionLevel:"Moderate-High", sampleSize:226, benchmarkSource:"DealStats" },
  seniorcare:      { label:"Senior Care / Home Health",        typicalMultiple:[2.0,3.8], benchmarkLow:2.03, benchmarkMid:2.9,  benchmarkHigh:3.8,  marginRange:[10,20], growth:"Growing",  riskFactor:0.78, demandScore:82, buyerInterestRank:4,  competitionLevel:"Moderate",      sampleSize:223, benchmarkSource:"DealStats" },
  signmaking:      { label:"Sign Manufacturing",               typicalMultiple:[1.9,3.3], benchmarkLow:1.94, benchmarkMid:2.45, benchmarkHigh:3.27, marginRange:[15,30], growth:"Stable",   riskFactor:0.85, demandScore:63, buyerInterestRank:13, competitionLevel:"Moderate",      sampleSize:378, benchmarkSource:"DealStats" },
  staffing:        { label:"Staffing / Recruiting",            typicalMultiple:[1.5,3.0], benchmarkLow:1.54, benchmarkMid:2.33, benchmarkHigh:2.98, marginRange:[15,25], growth:"Variable", riskFactor:0.88, demandScore:68, buyerInterestRank:11, competitionLevel:"High",          sampleSize:138, benchmarkSource:"DealStats" },
  veterinary:      { label:"Veterinary Practice",              typicalMultiple:[2.4,4.1], benchmarkLow:2.39, benchmarkMid:3.01, benchmarkHigh:4.1,  marginRange:[15,30], growth:"Growing",  riskFactor:0.70, demandScore:81, buyerInterestRank:4,  competitionLevel:"Low-Moderate",  sampleSize:45,  benchmarkSource:"DealStats" },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function generateCommunityData(industry: string, userScore: number) {
  const seed = industry.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  let x = seed;
  const r = () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; };
  const scores: number[] = [];
  for (let i = 0; i < 47; i++) scores.push(Math.round(25 + r() * 55));
  scores.push(userScore);
  scores.sort((a, b) => a - b);
  const rank = scores.indexOf(userScore) + 1;
  return { avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), topScore: Math.max(...scores), lowestScore: Math.min(...scores), percentile: Math.round((rank / scores.length) * 100), totalDeals: scores.length };
}

function calculateScores(inputs: DealInputs): ScoreBreakdown | null {
  const revenue = parseFloat(inputs.revenue.replace(/,/g, ""));
  const sde = parseFloat(inputs.sde.replace(/,/g, ""));
  const price = parseFloat(inputs.askingPrice.replace(/,/g, ""));
  const debtPct = parseFloat(inputs.debtPercent) / 100;
  const rate = parseFloat(inputs.interestRate) / 100;
  const term = parseFloat(inputs.loanTermYears);
  const industry = INDUSTRIES[inputs.industry];
  if (!revenue || !sde || !price || !industry || isNaN(debtPct) || isNaN(rate) || isNaN(term)) return null;

  const redFlags: string[] = [];
  const greenFlags: string[] = [];
  const multiple = price / sde;

  const { benchmarkLow, benchmarkMid, benchmarkHigh, sampleSize, benchmarkSource } = industry;
  const fairValueLow  = Math.round(sde * benchmarkLow);
  const fairValue     = Math.round(sde * benchmarkMid);
  const fairValueHigh = Math.round(sde * benchmarkHigh);

  let rangePosition: "Below Range" | "Within Range" | "Above Range";
  if (multiple < benchmarkLow)        rangePosition = "Below Range";
  else if (multiple > benchmarkHigh)  rangePosition = "Above Range";
  else                                 rangePosition = "Within Range";

  let valuationScore: number;
  if (multiple <= benchmarkLow * 0.85)      valuationScore = Math.min(95, 85 + (benchmarkLow - multiple) / benchmarkLow * 20);
  else if (multiple <= benchmarkMid)         valuationScore = Math.min(90, 70 + (benchmarkMid - multiple) / benchmarkMid * 40);
  else if (multiple <= benchmarkHigh)        valuationScore = 70 - ((multiple - benchmarkMid) / (benchmarkHigh - benchmarkMid)) * 25;
  else                                       valuationScore = Math.max(5, 40 - ((multiple - benchmarkHigh) / benchmarkHigh) * 60);
  valuationScore = Math.round(Math.max(5, Math.min(98, valuationScore)));

  let recommendedOffer: [number, number];
  if (price <= fairValueLow) {
    recommendedOffer = [Math.round(price * 0.80), Math.round(price * 1.0)];
  } else if (price <= fairValue) {
    recommendedOffer = [Math.round(price * 0.85), Math.round(price * 1.0)];
  } else if (price <= fairValueHigh) {
    recommendedOffer = [Math.round(fairValue * 0.90), fairValue];
  } else {
    recommendedOffer = [fairValueLow, fairValue];
  }

  const sdeMargin = (sde / revenue) * 100;

  if (rangePosition === "Above Range") {
    const pctAbove = Math.round(((multiple / benchmarkHigh) - 1) * 100);
    redFlags.push(`Asking multiple of ${multiple.toFixed(2)}x appears ${pctAbove}% above the ${benchmarkHigh.toFixed(2)}x high end of observed ${industry.label} transactions`);
  } else if (multiple > benchmarkMid * 1.05 && multiple <= benchmarkHigh) {
    redFlags.push(`Pricing in the upper portion of the ${benchmarkLow.toFixed(2)}–${benchmarkHigh.toFixed(2)}x observed range — may require justification through earnings quality or growth trajectory`);
  } else if (rangePosition === "Below Range") {
    greenFlags.push(`Asking multiple of ${multiple.toFixed(2)}x is below the ${benchmarkLow.toFixed(2)}x low end of observed transactions — warrants investigation of seller motivation`);
  } else {
    greenFlags.push(`Pricing is consistent with the ${benchmarkLow.toFixed(2)}–${benchmarkHigh.toFixed(2)}x range observed across ${sampleSize.toLocaleString()} comparable ${industry.label} transactions`);
  }

  if (sdeMargin < industry.marginRange[0] * 0.75) {
    redFlags.push(`SDE margin of ${sdeMargin.toFixed(0)}% is below the ${industry.marginRange[0]}–${industry.marginRange[1]}% observed range — buyers should evaluate cost structure and add-back sustainability`);
  } else if (sdeMargin > industry.marginRange[1]) {
    greenFlags.push(`Operating margin of ${sdeMargin.toFixed(0)}% is above the typical ${industry.marginRange[0]}–${industry.marginRange[1]}% range, supporting earnings quality`);
  } else if (sdeMargin >= industry.marginRange[0]) {
    greenFlags.push(`Operating margin of ${sdeMargin.toFixed(0)}% is consistent with ${industry.label} benchmarks`);
  }

  const valuationVerdict =
    rangePosition === "Below Range"  ? `${multiple.toFixed(2)}x is below the observed low end of ${benchmarkLow.toFixed(2)}x — pricing appears favorable relative to market comps` :
    multiple <= benchmarkMid         ? `${multiple.toFixed(2)}x is within range and below the ${benchmarkMid.toFixed(2)}x median — consistent with market-rate entry` :
    rangePosition === "Within Range" ? `${multiple.toFixed(2)}x is in the upper portion of the observed range — buyers should evaluate whether earnings quality supports the premium` :
    `${multiple.toFixed(2)}x appears above the ${benchmarkHigh.toFixed(2)}x high end of comparable transactions — ask may require negotiation or structural adjustment`;

  const loanAmount = price * debtPct;
  const monthlyRate = rate / 12;
  const numPayments = term * 12;
  const monthlyPayment = monthlyRate > 0
    ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
    : loanAmount / numPayments;
  const annualPayment = monthlyPayment * 12;
  const dscr = annualPayment > 0 ? sde / annualPayment : 99;

  let debtScore: number;
  if (dscr >= 2.0)       debtScore = 92;
  else if (dscr >= 1.5)  debtScore = 75 + (dscr - 1.5) * 34;
  else if (dscr >= 1.25) debtScore = 55 + (dscr - 1.25) * 80;
  else if (dscr >= 1.0)  debtScore = 30 + (dscr - 1.0) * 100;
  else                   debtScore = Math.max(5, dscr * 30);
  debtScore = Math.round(Math.max(5, Math.min(98, debtScore)));

  if (dscr < 1.0) {
    redFlags.push(`Projected DSCR of ${dscr.toFixed(2)}x falls below 1.0 — deal cash flow does not cover estimated debt service at proposed terms`);
  } else if (dscr < 1.25) {
    redFlags.push(`DSCR of ${dscr.toFixed(2)}x is below the standard 1.25x lender threshold — financing terms may require adjustment or additional equity`);
  } else if (dscr >= 1.5) {
    greenFlags.push(`DSCR of ${dscr.toFixed(2)}x provides comfortable coverage above lender minimums — supports SBA eligibility`);
  }

  const debtVerdict =
    dscr >= 1.5  ? `DSCR of ${dscr.toFixed(2)}x — debt service is well-covered at proposed terms` :
    dscr >= 1.25 ? `DSCR of ${dscr.toFixed(2)}x — meets standard lender minimums with limited buffer` :
    dscr >= 1.0  ? `DSCR of ${dscr.toFixed(2)}x — marginal coverage; buyers should evaluate sensitivity to revenue variance` :
    `DSCR of ${dscr.toFixed(2)}x — projected cash flow does not service proposed debt at current terms`;

  const growthScores: Record<string, number> = { Growing: 80, Stable: 65, Variable: 45, Volatile: 30 };
  const marketScore = growthScores[industry.growth] || 50;
  if (industry.growth === "Volatile") redFlags.push(`${industry.label} has historically exhibited volatile demand — buyers should evaluate revenue predictability across economic cycles`);
  if (industry.growth === "Growing")  greenFlags.push(`${industry.label} shows favorable growth indicators in current market data`);
  const marketVerdict = marketScore >= 70 ? "Industry conditions are broadly favorable" : marketScore >= 50 ? "Industry conditions are stable" : "Industry conditions present elevated cyclical risk";

  let industryScore = Math.round(Math.max(15, Math.min(95, (1 - industry.riskFactor) * 100 + 40)));
  if (sdeMargin < industry.marginRange[0]) industryScore -= 8;
  else if (sdeMargin > industry.marginRange[1]) industryScore += 5;
  industryScore = Math.round(Math.max(10, Math.min(95, industryScore)));
  const industryVerdict =
    industryScore >= 70 ? `${industry.label} presents below-average operational risk relative to SMB peers` :
    industryScore >= 45 ? `${industry.label} carries moderate operational and market risk` :
    `${industry.label} warrants elevated diligence given historical risk profile`;

  const overall = Math.round(Math.max(5, Math.min(98,
    valuationScore * 0.30 + debtScore * 0.30 + marketScore * 0.20 + industryScore * 0.20
  )));
  const riskLevel: ScoreBreakdown["riskLevel"] = overall >= 70 ? "Low" : overall >= 50 ? "Moderate" : overall >= 30 ? "High" : "Critical";
  const nextStep: ScoreBreakdown["nextStep"] = overall >= 65 ? "advance" : overall >= 45 ? "validate" : "reprice";

  return {
    overall, riskLevel, redFlags, greenFlags, nextStep,
    aiInsight: null, dealMemo: null,
    valuation: { score: valuationScore, multiple, marketRange: [benchmarkLow, benchmarkHigh], fairValue, fairValueLow, fairValueHigh, rangePosition, recommendedOffer, verdict: valuationVerdict, benchmarkSource, sampleSize },
    debtRisk: { score: debtScore, dscr, annualPayment, monthlyPayment, verdict: debtVerdict },
    marketRisk: { score: marketScore, industryGrowth: industry.growth, verdict: marketVerdict },
    industryRisk: { score: industryScore, marginRange: industry.marginRange, verdict: industryVerdict },
    marketIntel: { demandLevel: industry.demandScore >= 80 ? "HIGH" : industry.demandScore >= 65 ? "MODERATE" : "LOW", buyerInterestRank: industry.buyerInterestRank, competitionLevel: industry.competitionLevel, demandScore: industry.demandScore },
    communityComparison: generateCommunityData(inputs.industry, overall),
  };
}

function fmt(v: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v); }
function sc(s: number) { return s >= 70 ? "#10B981" : s >= 50 ? "#F59E0B" : s >= 30 ? "#F97316" : "#EF4444"; }
function rg(l: string) { return l === "Low" ? "linear-gradient(135deg,#065F46,#10B981)" : l === "Moderate" ? "linear-gradient(135deg,#92400E,#F59E0B)" : l === "High" ? "linear-gradient(135deg,#9A3412,#F97316)" : "linear-gradient(135deg,#991B1B,#EF4444)"; }
function dc(d: string) { return d === "HIGH" ? "#10B981" : d === "MODERATE" ? "#F59E0B" : "#EF4444"; }

function generateShareCard(results: ScoreBreakdown, industry: string, inputs: DealInputs): string {
  const col = sc(results.overall);
  const ind = INDUSTRIES[industry];
  const canvas = document.createElement("canvas");
  canvas.width = 1200; canvas.height = 630;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0A0E14"; ctx.fillRect(0, 0, 1200, 630);
  ctx.strokeStyle = "rgba(255,255,255,0.02)"; ctx.lineWidth = 1;
  for (let x = 0; x < 1200; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 630); ctx.stroke(); }
  for (let y = 0; y < 630; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1200, y); ctx.stroke(); }
  ctx.fillStyle = col; ctx.fillRect(0, 0, 4, 630);
  ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.fillRect(0, 0, 1200, 56);
  ctx.fillStyle = "#6366F1"; ctx.font = "bold 16px monospace"; ctx.fillText("NEXTAX", 24, 36);
  ctx.fillStyle = "#94A3B8"; ctx.font = "400 16px monospace"; ctx.fillText(".AI", 96, 36);
  ctx.fillStyle = "#4B5563"; ctx.font = "400 12px monospace"; ctx.fillText("DEAL INTELLIGENCE PLATFORM", 160, 36);
  ctx.textAlign = "right"; ctx.fillStyle = "#4B5563"; ctx.font = "400 12px monospace";
  ctx.fillText(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase(), 1176, 36);
  ctx.textAlign = "left";
  ctx.fillStyle = "#F59E0B"; ctx.font = "bold 13px monospace"; ctx.fillText("PRE-LOI SCREENING", 32, 90);
  ctx.fillStyle = "#E2E8F0"; ctx.font = "bold 26px sans-serif"; ctx.fillText(ind?.label || "Unknown Industry", 32, 124);
  ctx.fillStyle = "#6B7280"; ctx.font = "400 14px sans-serif";
  const price = parseFloat(inputs.askingPrice.replace(/,/g, ""));
  const sde = parseFloat(inputs.sde.replace(/,/g, ""));
  const rev = parseFloat(inputs.revenue.replace(/,/g, ""));
  ctx.fillText(`Revenue: ${fmt(rev)}  |  SDE: ${fmt(sde)}  |  Asking: ${fmt(price)}`, 32, 150);
  const scx = 150, scy = 310, sr = 90;
  ctx.beginPath(); ctx.arc(scx, scy, sr, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 12; ctx.stroke();
  ctx.beginPath(); ctx.arc(scx, scy, sr, -Math.PI / 2, -Math.PI / 2 + (results.overall / 100) * Math.PI * 2);
  ctx.strokeStyle = col; ctx.lineWidth = 12; ctx.lineCap = "round"; ctx.stroke();
  ctx.fillStyle = col; ctx.font = "bold 56px monospace"; ctx.textAlign = "center";
  ctx.fillText(String(results.overall), scx, scy + 16);
  ctx.fillStyle = "#6B7280"; ctx.font = "500 10px sans-serif"; ctx.fillText("DEAL SCORE", scx, scy + 36);
  ctx.textAlign = "left";
  ctx.fillStyle = col;
  ctx.beginPath(); (ctx as any).roundRect(scx - 55, scy + 55, 110, 28, 14); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(results.riskLevel + " Risk", scx, scy + 73); ctx.textAlign = "left";
  const mx = 310, my = 190;
  const metrics = [
    { label: "MULTIPLE", value: results.valuation.multiple.toFixed(2) + "x", range: `MKT ${results.valuation.marketRange[0].toFixed(1)}-${results.valuation.marketRange[1].toFixed(1)}x` },
    { label: "DSCR",     value: results.debtRisk.dscr.toFixed(2),             range: results.debtRisk.dscr >= 1.25 ? "PASS" : "BELOW MIN" },
    { label: "FAIR MID", value: fmt(results.valuation.fairValue),              range: "" },
    { label: "RANGE",    value: `${fmt(results.valuation.fairValueLow)}–${fmt(results.valuation.fairValueHigh)}`, range: "" },
  ];
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  (ctx as any).beginPath(); (ctx as any).roundRect(mx, my, 520, metrics.length * 44 + 16, 8); ctx.fill();
  metrics.forEach((m, i) => {
    const y = my + 28 + i * 44;
    ctx.fillStyle = "#4B5563"; ctx.font = "500 11px monospace"; ctx.fillText(m.label, mx + 16, y);
    ctx.fillStyle = "#E2E8F0"; ctx.font = "bold 18px monospace"; ctx.fillText(m.value, mx + 160, y);
    if (m.range) {
      const rc = m.range === "PASS" ? "#10B981" : m.range === "BELOW MIN" ? "#EF4444" : "#6B7280";
      ctx.fillStyle = rc; ctx.font = "500 11px monospace"; ctx.fillText(m.range, mx + 380, y);
    }
    if (i < metrics.length - 1) { ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.fillRect(mx + 16, y + 14, 488, 1); }
  });
  ctx.fillStyle = "rgba(99,102,241,0.08)";
  (ctx as any).beginPath(); (ctx as any).roundRect(mx, my + metrics.length * 44 + 30, 520, 50, 8); ctx.fill();
  ctx.fillStyle = "#818CF8"; ctx.font = "500 11px monospace"; ctx.fillText("OFFER RANGE", mx + 16, my + metrics.length * 44 + 52);
  ctx.fillStyle = "#10B981"; ctx.font = "bold 16px monospace";
  ctx.fillText(`${fmt(results.valuation.recommendedOffer[0])} – ${fmt(results.valuation.recommendedOffer[1])}`, mx + 160, my + metrics.length * 44 + 54);
  const insights = [...results.redFlags.slice(0, 2), ...results.greenFlags.slice(0, 1)];
  const iy = 500;
  ctx.fillStyle = "#4B5563"; ctx.font = "500 11px monospace"; ctx.fillText("SIGNALS", 32, iy);
  insights.forEach((ins, i) => {
    const isR = results.redFlags.includes(ins);
    ctx.fillStyle = isR ? "#FCA5A5" : "#6EE7B7"; ctx.font = "400 13px sans-serif";
    ctx.fillText("▸ " + ins.substring(0, 72) + (ins.length > 72 ? "…" : ""), 32, iy + 20 + i * 22);
  });
  ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.fillRect(0, 584, 1200, 46);
  ctx.fillStyle = "#374151"; ctx.font = "400 11px monospace"; ctx.fillText("PRE-LOI SCREENING TOOL", 24, 612);
  ctx.fillStyle = "#6366F1"; ctx.font = "500 11px monospace"; ctx.fillText("nextax.ai/deal-reality-check", 200, 612);
  ctx.textAlign = "right"; ctx.fillStyle = "#374151"; ctx.font = "400 11px monospace";
  ctx.fillText("DEAL INTELLIGENCE PLATFORM", 1176, 612); ctx.textAlign = "left";
  return canvas.toDataURL("image/png");
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function DealRealityCheck() {
  const [inputs, setInputs] = useState<DealInputs>({ revenue: "", sde: "", askingPrice: "", industry: "", debtPercent: "80", interestRate: "10.5", loanTermYears: "10" });
  const [inputMode, setInputMode] = useState<"paste" | "manual">("paste");
  const [pasteText, setPasteText] = useState("");
  const [pasteUrl, setPasteUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [extractSummary, setExtractSummary] = useState("");
  const [extractConfidence, setExtractConfidence] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extractNotice, setExtractNotice] = useState("");
  const [results, setResults] = useState<ScoreBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [dealMemo, setDealMemo] = useState<DealMemo | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [dealPageUrl, setDealPageUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [gateEmail, setGateEmail] = useState("");
  const [gateName, setGateName] = useState("");
  const [gateLoading, setGateLoading] = useState(false);
  const [pendingResults, setPendingResults] = useState<ScoreBreakdown | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const set = (f: keyof DealInputs, v: string) => setInputs((p) => ({ ...p, [f]: v }));
  const setCurrency = (f: keyof DealInputs, v: string) => { const c = v.replace(/[^0-9]/g, ""); set(f, c ? parseInt(c).toLocaleString() : ""); };

  const handleExtract = async () => {
    setExtracting(true); setExtractError(""); setExtractSummary(""); setExtractConfidence("");
    try {
      let res: Response;
      if (pdfFile) {
        const fd = new FormData(); fd.append("file", pdfFile);
        res = await fetch("/api/extract-listing", { method: "POST", body: fd });
      } else if (pasteUrl.trim()) {
        res = await fetch("/api/extract-listing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: pasteUrl.trim() }) });
      } else if (pasteText.trim()) {
        res = await fetch("/api/extract-listing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: pasteText.trim() }) });
      } else { setExtractError("Please paste a listing, enter a URL, or upload a CIM."); setExtracting(false); return; }
      const data = await res.json();
      if (!data.success || !data.extracted) { setExtractError(data.error || "Could not extract deal data. Try pasting the listing text instead."); setExtracting(false); return; }
      const e = data.extracted;
      if (e.revenue) set("revenue", Math.round(e.revenue).toLocaleString());
      if (e.sde || e.cash_flow) set("sde", Math.round(e.sde || e.cash_flow).toLocaleString());
      if (e.asking_price) set("askingPrice", Math.round(e.asking_price).toLocaleString());
      if (e.industry_key && INDUSTRIES[e.industry_key]) set("industry", e.industry_key);
      if (e.summary) setExtractSummary(e.summary);
      if (e.confidence) setExtractConfidence(e.confidence);
      const missing: string[] = [];
      if (!e.revenue) missing.push("Revenue");
      if (!e.sde && !e.cash_flow) missing.push("SDE");
      if (!e.asking_price) missing.push("Asking Price");
      if (!e.industry_key || !INDUSTRIES[e.industry_key]) missing.push("Industry");
      if (missing.length > 0) {
        setExtractNotice(`Please fill in the missing fields: ${missing.join(", ")}. ${pasteUrl.trim() ? "This site may require login to view financials — try pasting the listing text instead." : ""}`);
      } else { setExtractNotice(""); }
      setInputMode("manual");
    } catch { setExtractError("Extraction failed. Please try pasting the listing text directly."); }
    setExtracting(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    const scores = calculateScores(inputs);
    if (scores) { setPendingResults(scores); setShowGate(true); }
    setLoading(false);
  };

  const handleGateSubmit = async () => {
    if (!gateEmail) return;
    setGateLoading(true);
    try {
      await fetch("/api/capture-lead", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: gateName, email: gateEmail, source: "reality-check", industry: inputs.industry, dealScore: pendingResults?.overall, metadata: { multiple: pendingResults?.valuation.multiple, dscr: pendingResults?.debtRisk.dscr } }),
      });
    } catch { /* non-blocking */ }
    setResults(pendingResults);
    setShowGate(false);
    setShowResults(true);
    setGateLoading(false);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    if (pendingResults) {
      fetchAI(pendingResults);
      fetchBenchmarks(pendingResults).then(() => {
        setResults((finalScores) => {
          if (finalScores) { createDealPage(finalScores); recordDeal(finalScores); }
          return finalScores;
        });
      });
    }
  };

  const createDealPage = async (scores: ScoreBreakdown) => {
    try {
      const ind = INDUSTRIES[inputs.industry];
      const revenue = parseFloat(inputs.revenue.replace(/,/g, ""));
      const sde = parseFloat(inputs.sde.replace(/,/g, ""));
      const price = parseFloat(inputs.askingPrice.replace(/,/g, ""));
      const res = await fetch("/api/deal-page", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: inputs.industry, industry_label: ind?.label || inputs.industry,
          revenue, sde, asking_price: price,
          valuation_multiple: scores.valuation.multiple, dscr: scores.debtRisk.dscr,
          monthly_payment: scores.debtRisk.monthlyPayment, fair_value: scores.valuation.fairValue,
          fair_value_low: scores.valuation.fairValueLow, fair_value_high: scores.valuation.fairValueHigh,
          range_position: scores.valuation.rangePosition,
          recommended_offer_low: scores.valuation.recommendedOffer[0],
          recommended_offer_high: scores.valuation.recommendedOffer[1],
          overall_score: scores.overall, risk_level: scores.riskLevel,
          valuation_score: scores.valuation.score, debt_score: scores.debtRisk.score,
          market_score: scores.marketRisk.score, industry_score: scores.industryRisk.score,
          red_flags: scores.redFlags, green_flags: scores.greenFlags, ai_insight: scores.aiInsight,
          community_avg_score: scores.communityComparison.avgScore,
          community_top_score: scores.communityComparison.topScore,
          community_lowest_score: scores.communityComparison.lowestScore,
          community_percentile: scores.communityComparison.percentile,
          similar_deals_count: scores.communityComparison.totalDeals,
          demand_level: scores.marketIntel.demandLevel,
          buyer_interest_rank: scores.marketIntel.buyerInterestRank,
          competition_level: scores.marketIntel.competitionLevel,
          source_tool: "reality_check",
        }),
      });
      const data = await res.json();
      if (data.success && data.url) setDealPageUrl(data.url);
    } catch { /* non-blocking */ }
  };

  const fetchBenchmarks = async (scores: ScoreBreakdown) => {
    try {
      const revenue = parseFloat(inputs.revenue.replace(/,/g, ""));
      const sde = parseFloat(inputs.sde.replace(/,/g, ""));
      const price = parseFloat(inputs.askingPrice.replace(/,/g, ""));
      const res = await fetch("/api/benchmark-lookup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry: inputs.industry, state: null, revenue, sde, asking_price: price }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;
      const b = data.benchmarks, a = data.analysis, c = data.confidence;
      setResults((prev) => {
        if (!prev) return prev;
        let newValScore = prev.valuation.score;
        let newMarketRange = prev.valuation.marketRange;
        let newFairValue = prev.valuation.fairValue;
        let newOverall = prev.overall;
        if (b.transaction) {
          const txnMult = b.transaction.cashflowMultiple;
          newMarketRange = a.effectiveMultipleRange;
          newFairValue = a.effectiveFairValue;
          const dealMult = a.dealMultiple;
          if (dealMult <= txnMult * 0.85) newValScore = Math.min(95, 85 + (txnMult - dealMult) / txnMult * 20);
          else if (dealMult <= txnMult) newValScore = Math.min(90, 70 + (txnMult - dealMult) / txnMult * 40);
          else if (dealMult <= txnMult * 1.15) newValScore = 70 - ((dealMult - txnMult) / txnMult) * 50;
          else if (dealMult <= txnMult * 1.3) newValScore = 50 - ((dealMult - txnMult * 1.15) / txnMult) * 60;
          else newValScore = Math.max(5, 30 - ((dealMult - txnMult * 1.3) / txnMult) * 50);
          newValScore = Math.round(Math.max(5, Math.min(98, newValScore)));
          const w = c.weights;
          newOverall = Math.round(Math.max(5, Math.min(98,
            newValScore * (w.valuation / 100) + prev.debtRisk.score * (w.debt / 100) +
            prev.marketRisk.score * ((w.financial + w.liquidity) / 200) +
            prev.industryRisk.score * ((w.financial + w.liquidity) / 200)
          )));
        }
        const newRiskLevel: ScoreBreakdown["riskLevel"] = newOverall >= 70 ? "Low" : newOverall >= 50 ? "Moderate" : newOverall >= 30 ? "High" : "Critical";
        const newRedFlags = [...prev.redFlags];
        const newGreenFlags = [...prev.greenFlags];
        if (b.transaction && a.sellerBuyerGap && a.sellerBuyerGap > 20) {
          newRedFlags.push(`Sellers in this industry have historically listed ${a.sellerBuyerGap.toFixed(0)}% above closed transaction prices — buyers should factor typical negotiation discount into offer strategy`);
        }
        if (b.transaction && b.transaction.saleToAskRatio < 0.90) {
          newGreenFlags.push(`Comparable transactions closed at approximately ${Math.round((1 - b.transaction.saleToAskRatio) * 100)}% below asking — supports an anchored offer below list`);
        }
        if (b.transaction && b.transaction.daysOnMarket > 250) {
          newGreenFlags.push(`Median days on market of ${b.transaction.daysOnMarket} days suggests extended listing periods — buyers may have negotiating leverage`);
        }
        return {
          ...prev, overall: newOverall, riskLevel: newRiskLevel,
          valuation: { ...prev.valuation, score: newValScore, marketRange: newMarketRange, fairValue: newFairValue, recommendedOffer: a.smartOfferRange },
          redFlags: newRedFlags, greenFlags: newGreenFlags,
          threeLens: {
            listing: b.listing ? { medianMultiple: b.listing.medianMultiple, sampleSize: b.listing.sampleSize } : null,
            transaction: b.transaction ? { cashflowMultiple: b.transaction.cashflowMultiple, saleToAskRatio: b.transaction.saleToAskRatio, daysOnMarket: b.transaction.daysOnMarket, reportedSales: b.transaction.reportedSales, subsector: b.transaction.subsector } : null,
            financial: b.financial ? { sdeMargin: b.financial.sdeMargin } : null,
            sellerBuyerGap: a.sellerBuyerGap, estimatedNegotiatedPrice: a.estimatedNegotiatedPrice,
            smartOfferRange: a.smartOfferRange,
            confidence: { overall: c.overall, listing: { grade: c.listing.grade, description: c.listing.description, sampleSize: c.listing.sampleSize }, transaction: { grade: c.transaction.grade, description: c.transaction.description, sampleSize: c.transaction.sampleSize }, financial: { grade: c.financial.grade, description: c.financial.description, sampleSize: c.financial.sampleSize }, weights: c.weights },
          },
        };
      });
    } catch (err) { console.error("Benchmark fetch error:", err); }
  };

  const recordDeal = async (scores: ScoreBreakdown) => {
    try {
      await fetch("/api/record-deal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool_used: "reality_check", industry: inputs.industry,
          revenue: inputs.revenue, sde: inputs.sde, asking_price: inputs.askingPrice,
          debt_percent: parseFloat(inputs.debtPercent), interest_rate: parseFloat(inputs.interestRate),
          term_years: parseInt(inputs.loanTermYears),
          valuation_multiple: +results!.valuation.multiple.toFixed(2),
          dscr: +scores.debtRisk.dscr.toFixed(2), monthly_payment: Math.round(scores.debtRisk.monthlyPayment),
          fair_value: scores.valuation.fairValue, fair_value_low: scores.valuation.fairValueLow,
          fair_value_high: scores.valuation.fairValueHigh, range_position: scores.valuation.rangePosition,
          recommended_offer_low: scores.valuation.recommendedOffer[0], recommended_offer_high: scores.valuation.recommendedOffer[1],
          overall_score: scores.overall, risk_level: scores.riskLevel,
          valuation_score: scores.valuation.score, debt_score: scores.debtRisk.score,
          market_score: scores.marketRisk.score, industry_score: scores.industryRisk.score,
          red_flags: scores.redFlags, green_flags: scores.greenFlags, next_step: scores.nextStep,
        }),
      });
    } catch { /* non-blocking */ }
  };

  const fetchAI = async (scores: ScoreBreakdown) => {
    setAiLoading(true); setDealMemo(null);
    const ind = INDUSTRIES[inputs.industry];
    const sdeMargin = inputs.revenue ? ((parseFloat(inputs.sde.replace(/,/g,"")) / parseFloat(inputs.revenue.replace(/,/g,""))) * 100).toFixed(1) : "N/A";
    const askPrice = parseFloat(inputs.askingPrice.replace(/,/g,""));
    const fairMid  = scores.valuation.fairValue;
    const fairLow  = scores.valuation.fairValueLow;
    const fairHigh = scores.valuation.fairValueHigh;
    const gapPct   = ((askPrice - fairMid) / fairMid * 100).toFixed(1);
    const mktLow   = scores.valuation.marketRange[0].toFixed(2);
    const mktHigh  = scores.valuation.marketRange[1].toFixed(2);
    const mktMid   = ((scores.valuation.marketRange[0] + scores.valuation.marketRange[1]) / 2).toFixed(2);
    const systemPrompt = `You are a senior M&A advisor producing a pre-LOI deal screening memo. Your output must be a single valid JSON object — no markdown, no backticks, no text before or after the JSON. Be analytical, conditional, and institutional. Never use absolute language. Use ranges and conditional statements. Keep every field concise.`;
    const userPrompt = `Produce a deal screening memo for this ${ind?.label} acquisition.\n\nDEAL METRICS:\n- Asking: $${askPrice.toLocaleString()} (${scores.valuation.multiple.toFixed(2)}x SDE)\n- Fair Value Range: $${fairLow.toLocaleString()}–$${fairHigh.toLocaleString()} (median $${fairMid.toLocaleString()})\n- Market Range: ${mktLow}–${mktHigh}x median ${mktMid}x — ${scores.valuation.sampleSize.toLocaleString()} transactions (${scores.valuation.benchmarkSource})\n- Range Position: ${scores.valuation.rangePosition} (${Number(gapPct)>0?"+":""}${gapPct}% vs median)\n- SDE Margin: ${sdeMargin}% (industry: ${ind?.marginRange[0]}–${ind?.marginRange[1]}%)\n- DSCR: ${scores.debtRisk.dscr.toFixed(2)}x\n- Score: ${scores.overall}/100 (${scores.riskLevel} Risk)\n\nReturn ONLY this JSON:\n{"positioning":{"marketPosition":"Above Market or Inline with Market or Below Market","buyerFit":"best fit buyer type","executionDifficulty":"Low or Moderate or High","negotiationLeverage":"Low or Moderate or High"},"whatMustBeTrue":["assumption 1","assumption 2","assumption 3","assumption 4"],"decisionPath":{"steps":["Step 1","Step 2","Step 3"],"ifValidated":"next action if validated","ifNot":"recourse if not"},"negotiationPlaybook":{"anchorRange":"opening offer range","structureIdeas":["idea 1","idea 2"],"walkAway":"walk-away condition"},"dealBreakers":["risk 1","risk 2","risk 3"],"confidenceNote":"data note","pricingContext":"2-3 sentences","businessQuality":"2-3 sentences","buyerInterpretation":"2-3 sentences"}`;
    try {
      const res = await fetch("/api/deal-reality-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system: systemPrompt, messages: [{ role: "user", content: userPrompt }] }) });
      const data = await res.json();
      const raw = data.content?.map((b: { type: string; text?: string }) => (b.type === "text" ? b.text : "")).join("") || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const memo: DealMemo = JSON.parse(jsonMatch[0]);
          setDealMemo(memo);
          setResults((p) => p ? { ...p, dealMemo: memo, aiInsight: [memo.pricingContext, memo.businessQuality, memo.buyerInterpretation].join("\n\n") } : p);
          setAiLoading(false); return;
        } catch { /* fall through */ }
      }
    } catch { /* fall through */ }
    buildFallbackMemo(scores, ind, sdeMargin, gapPct, mktLow, mktHigh, mktMid, askPrice, fairLow, fairMid, fairHigh);
    setAiLoading(false);
  };

  const buildFallbackMemo = (scores: ScoreBreakdown, ind: typeof INDUSTRIES[string] | undefined, sdeMargin: string, gapPct: string, mktLow: string, mktHigh: string, mktMid: string, askPrice: number, fairLow: number, fairMid: number, fairHigh: number) => {
    const isAbove  = scores.valuation.rangePosition === "Above Range";
    const isBelow  = scores.valuation.rangePosition === "Below Range";
    const dscrOk   = scores.debtRisk.dscr >= 1.25;
    const marginOk = parseFloat(sdeMargin) >= (ind?.marginRange[0] || 0);
    const gapN     = parseFloat(gapPct);
    const sdeNum   = parseFloat(inputs.sde.replace(/,/g,"")) || 0;
    const memo: DealMemo = {
      positioning: { marketPosition: isAbove ? "Above Market" : isBelow ? "Below Market" : "Inline with Market", buyerFit: scores.overall >= 65 ? "Operator / Strategic" : scores.overall >= 45 ? "Operator" : "First-Time Buyer", executionDifficulty: isAbove || !dscrOk ? "High" : scores.overall >= 65 ? "Low" : "Moderate", negotiationLeverage: isAbove ? "High" : isBelow ? "Low" : "Moderate" },
      whatMustBeTrue: [`Revenue and SDE must remain at or above reported levels — if SDE declines 10%, implied fair value falls to approximately $${Math.round(fairLow * 0.9).toLocaleString()}`, `All seller add-backs must be documented and non-recurring — unsupported add-backs would reduce effective SDE and compress the justified multiple`, `DSCR of ${scores.debtRisk.dscr.toFixed(2)}x must hold under stress — a 15% revenue decline would pressure coverage toward the 1.0x threshold at current debt terms`, `Customer concentration must be within acceptable limits — revenue from any single account above 25% introduces meaningful volatility risk`],
      decisionPath: { steps: ["Execute NDA and request 3 years of tax returns, P&L statements, and owner compensation detail", "Validate all reported add-backs with supporting documentation", "Confirm customer concentration and split between recurring and project-based revenue"], ifValidated: `If financials confirm reported SDE and add-backs are documented → proceed to LOI targeting ${fmt(Math.round(fairMid * 0.95))}–${fmt(fairMid)}`, ifNot: `If SDE is lower than reported or add-backs are unsupported → renegotiate toward ${fmt(fairLow)}–${fmt(Math.round(fairMid * 0.9))} or restructure with a seller note covering the valuation gap` },
      negotiationPlaybook: { anchorRange: `Open at ${fmt(Math.round(fairLow * (gapN > 20 ? 0.95 : 1.0)))}–${fmt(fairMid)}, anchored to ${scores.valuation.sampleSize.toLocaleString()} comparable closed transactions (${scores.valuation.benchmarkSource})`, structureIdeas: [gapN > 15 ? `Seller note covering ${Math.min(30, Math.round(gapN / 2))}% of the gap above median fair value` : "Standard SBA structure with 90-day seller transition", `Earn-out tied to Year 1 SDE at or above $${Math.round(sdeNum * 0.95).toLocaleString()} — limits downside if performance lags representations`], walkAway: `If seller will not move below ${fmt(Math.round(fairHigh * 1.15))} and financials do not support the represented SDE, return assumptions become difficult to underwrite on standard terms` },
      dealBreakers: ["SDE materially lower than represented after owner compensation normalization and add-back review", `DSCR falls below 1.0x under a 15% revenue stress scenario at current debt terms`, "Customer concentration above 30% in a single account without a binding multi-year contract", "Owner performing non-transferable technical or relationship functions with no identified successor"],
      confidenceNote: `Analysis benchmarked against ${scores.valuation.sampleSize.toLocaleString()} comparable ${ind?.label || ""} transactions (${scores.valuation.benchmarkSource}). Limitations: add-backs, customer concentration, and operational risk factors are not verified at this stage — this is a screening analysis only.`,
      pricingContext: `The ${ind?.label} asking price of ${scores.valuation.multiple.toFixed(2)}x SDE is ${scores.valuation.rangePosition.toLowerCase()} the ${mktLow}–${mktHigh}x range observed across ${scores.valuation.sampleSize.toLocaleString()} comparable transactions, with the ask ${Math.abs(gapN).toFixed(1)}% ${gapN > 0 ? "above" : "below"} the ${mktMid}x median. ${isAbove ? "The premium may require justification through demonstrable earnings quality or identifiable growth trajectory." : isBelow ? "Below-range pricing warrants investigation of seller motivation before assuming it represents upside." : "Pricing appears broadly consistent with market norms for this industry."}`,
      businessQuality: `Operating margin of ${sdeMargin}% ${marginOk ? "is within" : "falls below"} the ${ind?.marginRange[0]}–${ind?.marginRange[1]}% industry range${marginOk ? ", supporting the quality of reported earnings" : " — buyers should evaluate cost structure and add-back reliability"}. Projected DSCR of ${scores.debtRisk.dscr.toFixed(2)}x ${dscrOk ? "meets standard lender thresholds, supporting SBA financing eligibility" : "falls below the 1.25x lender minimum and may require additional equity or revised debt structure"}.`,
      buyerInterpretation: `For the deal to underwrite at the asking price, reported SDE must be confirmed as normalized and sustainable, and debt coverage must hold under at least a 10–15% revenue stress scenario. ${isAbove ? "The primary risk concentrates in valuation — the ask requires above-median earnings quality to support the implied multiple." : "The primary risk concentrates in operational reliability — buyers should validate revenue predictability and owner dependency before advancing."} Priority diligence action: obtain 3 years of tax returns and normalize owner compensation before submitting an LOI.`,
    };
    setDealMemo(memo);
    setResults((p) => p ? { ...p, dealMemo: memo, aiInsight: [memo.pricingContext, memo.businessQuality, memo.buyerInterpretation].join("\n\n") } : p);
  };

  const handleShareImage = () => { if (!results) return; const d = generateShareCard(results, inputs.industry, inputs); const l = document.createElement("a"); l.download = `nextax-deal-score-${results.overall}.png`; l.href = d; l.click(); };

  const isValid = inputs.revenue && inputs.sde && inputs.askingPrice && inputs.industry;

  // ── Derived display values used in results ──────────────────────────────────
  const askPrice   = results ? parseFloat(inputs.askingPrice.replace(/,/g, "")) : 0;
  const gapPct     = results ? Math.round(((results.valuation.multiple - results.valuation.marketRange[0]) / ((results.valuation.marketRange[0] + results.valuation.marketRange[1]) / 2)) * 100) : 0;
  const gapVsMid   = results ? Math.round(((askPrice - results.valuation.fairValue) / results.valuation.fairValue) * 100) : 0;
  const indLabel   = INDUSTRIES[inputs.industry]?.label || "";
  const isOverpriced = results ? results.valuation.rangePosition === "Above Range" : false;
  const isFair       = results ? results.valuation.rangePosition === "Within Range" : false;
  const heroColor  = results ? (isOverpriced ? "#D85A30" : isFair ? "#3B82F6" : "#10B981") : "#E2E8F0";
  const pillColor  = results ? (isOverpriced ? { bg: "#FAEEDA", text: "#854F0B" } : isFair ? { bg: "#E6F1FB", text: "#185FA5" } : { bg: "#EAF3DE", text: "#3B6D11" }) : { bg: "#E6F1FB", text: "#185FA5" };
  const pillLabel  = results ? (isOverpriced ? "Moderately Overpriced" : isFair ? "Fair Market" : "Undervalued") : "";
  const walkAway   = results ? Math.round(results.valuation.fairValueHigh * 1.08) : 0;
  const impliedDiscountLow  = results ? Math.round(((results.valuation.recommendedOffer[0] - askPrice) / askPrice) * 100) : 0;
  const impliedDiscountHigh = results ? Math.round(((results.valuation.recommendedOffer[1] - askPrice) / askPrice) * 100) : 0;

  // Hardcoded market signal rows (top 4 relevant to current industry)
  const marketSignalRows = results ? [
    { industry: "HVAC",                 gap: 31,  signal: "Highly overpriced", signalColor: "#A32D2D", signalBg: "#FCEBEB",  rowBg: "#FCEBEB" },
    { industry: indLabel + " ← you",   gap: gapVsMid, signal: isOverpriced ? "Overpriced" : isFair ? "Fair market" : "Opportunity", signalColor: isOverpriced ? "#854F0B" : isFair ? "#185FA5" : "#3B6D11", signalBg: isOverpriced ? "#FAEEDA" : isFair ? "#E6F1FB" : "#EAF3DE", rowBg: isOverpriced ? "#FAEEDA" : isFair ? "#E6F1FB" : "#EAF3DE" },
    { industry: "Laundromat",           gap: 4,   signal: "Fair market",       signalColor: "#185FA5", signalBg: "#E6F1FB",  rowBg: "transparent" },
    { industry: "Pest Control",         gap: -6,  signal: "Opportunity",       signalColor: "#3B6D11", signalBg: "#EAF3DE",  rowBg: "transparent" },
  ] : [];

  return (
    <div className="min-h-screen" style={{ background: "#0B0F17", color: "#E2E8F0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=JetBrains+Mono:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
        *{box-sizing:border-box}select,input{font-family:'DM Sans',sans-serif}select:focus,input:focus{border-color:rgba(99,102,241,0.5)!important;outline:none}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .35s ease-out forwards}.fd1{animation-delay:.06s;opacity:0}.fd2{animation-delay:.12s;opacity:0}.fd3{animation-delay:.18s;opacity:0}.fd4{animation-delay:.24s;opacity:0}.fd5{animation-delay:.30s;opacity:0}.fd6{animation-delay:.36s;opacity:0}.fd7{animation-delay:.42s;opacity:0}.fd8{animation-delay:.48s;opacity:0}
      `}</style>

      {/* ── HERO ── */}
      <div style={{ padding: "44px 24px 36px", textAlign: "center", background: "radial-gradient(ellipse at center top, rgba(99,102,241,0.07) 0%, transparent 60%)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 20, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", fontSize: 12, color: "#F59E0B", fontWeight: 600, marginBottom: 18 }}>
          ⚡ Pre-LOI Acquisition Screening
        </div>
        <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 800, margin: "0 0 10px", fontFamily: "'Instrument Serif', serif", background: "linear-gradient(135deg, #F8FAFC 0%, #94A3B8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.15 }}>
          Deal Reality Check
        </h1>
        <p style={{ fontSize: 15, color: "#8896A6", maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
          Paste a listing, drop a URL, upload a CIM, or enter numbers manually. AI extracts the financials and runs a full valuation screening instantly.
        </p>
      </div>

      {/* ── INPUT SECTION ── */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px 40px" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 4, border: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => setInputMode("paste")} style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", background: inputMode === "paste" ? "rgba(245,158,11,0.15)" : "transparent", color: inputMode === "paste" ? "#F59E0B" : "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            📋 Paste a Listing
          </button>
          <button onClick={() => setInputMode("manual")} style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", background: inputMode === "manual" ? "rgba(245,158,11,0.15)" : "transparent", color: inputMode === "manual" ? "#F59E0B" : "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            ✏️ Enter Numbers
          </button>
        </div>

        {inputMode === "paste" && (
          <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "24px 24px 18px" }}>
            <div style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>🤖 AI-Powered Extraction<span style={{ fontSize: 11, fontWeight: 400, color: "#6B7280" }}>— paste text, URL, or upload PDF</span></div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Paste Listing, Broker Email, or Deal Memo</label>
              <textarea value={pasteText} onChange={(e) => { setPasteText(e.target.value); setPasteUrl(""); setPdfFile(null); }} placeholder={"Example:\n\nWell-established cleaning service in Austin, TX. Revenue $520,000. SDE $145,000. Asking $475,000..."} style={{ width: "100%", minHeight: 130, padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 13, fontFamily: "'DM Sans', sans-serif", resize: "vertical", outline: "none", lineHeight: 1.6 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "14px 0" }}><div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} /><span style={{ fontSize: 11, color: "#4B5563" }}>OR</span><div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} /></div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Paste a Listing URL</label>
              <input type="url" value={pasteUrl} onChange={(e) => { setPasteUrl(e.target.value); setPasteText(""); setPdfFile(null); }} placeholder="https://www.bizbuysell.com/Business-Opportunity/..." style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14, outline: "none" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "14px 0" }}><div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} /><span style={{ fontSize: 11, color: "#4B5563" }}>OR</span><div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} /></div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Upload CIM or Deal Memo (PDF)</label>
              <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 16px", borderRadius: 10, border: "1.5px dashed rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.02)", cursor: "pointer" }}>
                <input type="file" accept=".pdf" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPdfFile(f); setPasteText(""); setPasteUrl(""); } }} />
                {pdfFile ? <span style={{ fontSize: 13, color: "#10B981", fontWeight: 500 }}>📄 {pdfFile.name}</span> : <span style={{ fontSize: 13, color: "#6B7280" }}>📤 Click to upload PDF</span>}
              </label>
            </div>
            {extractError && <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", fontSize: 13, color: "#FCA5A5" }}>{extractError}</div>}
            {extractSummary && (
              <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 8, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <div style={{ fontSize: 11, color: "#10B981", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>✓ Extracted {extractConfidence === "high" ? "(High Confidence)" : extractConfidence === "medium" ? "(Medium Confidence)" : "(Low Confidence — verify numbers)"}</div>
                <div style={{ fontSize: 13, color: "#6EE7B7" }}>{extractSummary}</div>
              </div>
            )}
            <button onClick={handleExtract} disabled={extracting || (!pasteText.trim() && !pasteUrl.trim() && !pdfFile)} style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: (pasteText.trim() || pasteUrl.trim() || pdfFile) && !extracting ? "linear-gradient(135deg, #F59E0B, #D97706)" : "rgba(255,255,255,0.08)", color: (pasteText.trim() || pasteUrl.trim() || pdfFile) ? "#fff" : "#6B7280", fontSize: 15, fontWeight: 700, cursor: (pasteText.trim() || pasteUrl.trim() || pdfFile) && !extracting ? "pointer" : "not-allowed", fontFamily: "'DM Sans', sans-serif", opacity: extracting ? 0.7 : 1 }}>
              {extracting ? "🤖 AI Extracting Deal Data..." : "⚡ Extract & Analyze"}
            </button>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
              {["BizBuySell", "Acquire.com", "Broker emails", "CIM PDFs", "Axial"].map((s) => <span key={s} style={{ fontSize: 10, color: "#374151" }}>✓ {s}</span>)}
            </div>
          </div>
        )}

        {inputMode === "manual" && (
          <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "24px 24px 18px" }}>
            {extractNotice && (
              <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#F59E0B", marginBottom: 2 }}>Missing Data From Listing</div>
                  <div style={{ fontSize: 12, color: "#FBBF24", lineHeight: 1.5 }}>{extractNotice}</div>
                </div>
                <button onClick={() => setExtractNotice("")} style={{ marginLeft: "auto", background: "none", border: "none", color: "#6B7280", cursor: "pointer", fontSize: 14, flexShrink: 0 }}>✕</button>
              </div>
            )}
            {extractSummary && !extractNotice && (
              <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <div style={{ fontSize: 11, color: "#10B981", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>✓ Data Extracted — Verify & Submit</div>
                <div style={{ fontSize: 12, color: "#6EE7B7" }}>{extractSummary}</div>
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Industry</label>
              <select value={inputs.industry} onChange={(e) => set("industry", e.target.value)} style={{ width: "100%", padding: "11px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14 }}>
                <option value="">Select industry...</option>
                {Object.entries(INDUSTRIES).sort((a, b) => a[1].label.localeCompare(b[1].label)).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 4 }}>
              {[["revenue", "Annual Revenue", "500,000"], ["sde", "SDE / Cash Flow", "150,000"]].map(([f, l, p]) => (
                <div key={f} style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6B7280", fontSize: 14 }}>$</span>
                    <input type="text" placeholder={p} value={(inputs as Record<string, string>)[f]} onChange={(e) => setCurrency(f as keyof DealInputs, e.target.value)} style={{ width: "100%", padding: "11px 12px 11px 26px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14 }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Asking Price</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6B7280", fontSize: 14 }}>$</span>
                <input type="text" placeholder="450,000" value={inputs.askingPrice} onChange={(e) => setCurrency("askingPrice", e.target.value)} style={{ width: "100%", padding: "11px 12px 11px 26px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14 }} />
              </div>
            </div>
            <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 500 }}>Debt Terms</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[["debtPercent", "Debt %"], ["interestRate", "Rate %"], ["loanTermYears", "Term (Yr)"]].map(([f, l]) => (
                  <div key={f}>
                    <label style={{ display: "block", fontSize: 10, color: "#8896A6", marginBottom: 4 }}>{l}</label>
                    <input type="text" value={(inputs as Record<string, string>)[f]} onChange={(e) => set(f as keyof DealInputs, e.target.value.replace(/[^0-9.]/g, ""))} style={{ width: "100%", padding: "9px 10px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#E2E8F0", fontSize: 14, textAlign: "center" }} />
                  </div>
                ))}
              </div>
            </div>
            <button onClick={handleSubmit} disabled={!isValid || loading} style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: isValid && !loading ? "linear-gradient(135deg, #F59E0B, #D97706)" : "rgba(255,255,255,0.08)", color: isValid ? "#fff" : "#6B7280", fontSize: 15, fontWeight: 700, cursor: isValid && !loading ? "pointer" : "not-allowed", fontFamily: "'DM Sans', sans-serif", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Analyzing Deal..." : "⚡ Check My Deal"}
            </button>
          </div>
        )}
      </div>

      {/* ── EMAIL GATE ── */}
      {showGate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}>
          <div className="fu" style={{ background: "#141922", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "36px 32px", maxWidth: 440, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px", color: "#E2E8F0", fontFamily: "'Instrument Serif', serif" }}>Your screening results are ready</h2>
            <p style={{ fontSize: 14, color: "#8896A6", margin: "0 0 24px", lineHeight: 1.5 }}>Enter your email to view your Deal Reality Score, AI assessment, and valuation range analysis.</p>
            <div style={{ textAlign: "left", marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>First Name</label>
              <input type="text" placeholder="Steve" value={gateName} onChange={(e) => setGateName(e.target.value)} style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14 }} />
            </div>
            <div style={{ textAlign: "left", marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</label>
              <input type="email" placeholder="you@email.com" value={gateEmail} onChange={(e) => setGateEmail(e.target.value)} style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14 }} />
            </div>
            <button onClick={handleGateSubmit} disabled={!gateEmail || gateLoading} style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: gateEmail ? "linear-gradient(135deg, #F59E0B, #D97706)" : "rgba(255,255,255,0.08)", color: gateEmail ? "#fff" : "#6B7280", fontSize: 15, fontWeight: 700, cursor: gateEmail ? "pointer" : "not-allowed", fontFamily: "'DM Sans', sans-serif" }}>
              {gateLoading ? "Loading..." : "⚡ See My Results"}
            </button>
            <p style={{ fontSize: 11, color: "#4B5563", marginTop: 12 }}>No spam. Unsubscribe anytime.</p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          RESULTS — V2 LAYOUT matching screenshot
      ══════════════════════════════════════════════════════════════ */}
      {showResults && results && (
        <div ref={resultsRef} style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px 60px" }}>

          {/* ── SECTION 1: HERO DECISION BLOCK ── */}
          <div className="fu" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderLeft: `3px solid ${heroColor}`, borderRadius: 16, padding: "28px 24px", marginBottom: 14 }}>

            {/* Top row: score + pill + 4 metric cards */}
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>

              {/* Left: score + verdict */}
              <div style={{ flex: 1, minWidth: 200 }}>
                {/* Breadcrumb */}
                <div style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 500 }}>
                  DEAL REALITY CHECK
                </div>

                {/* Big score + pill inline */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
                  <span style={{ fontSize: 64, fontWeight: 700, lineHeight: 1, color: heroColor, fontFamily: "'JetBrains Mono', monospace" }}>
                    {results.valuation.multiple.toFixed(2)}
                  </span>
                  <div>
                    <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: 20, background: pillColor.bg, color: pillColor.text, fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      {pillLabel}
                    </div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>Deal Reality Score</div>
                  </div>
                </div>

                {/* Hero headline */}
                <div style={{ fontSize: 20, fontWeight: 700, color: heroColor, marginBottom: 4 }}>
                  {isOverpriced ? `Overpriced by ~${Math.abs(gapVsMid)}%` : isFair ? "Fair market pricing" : `Undervalued by ~${Math.abs(gapVsMid)}%`}
                </div>
                <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 14, fontWeight: 500 }}>
                  {isOverpriced ? "Do not proceed at this price without renegotiation." : isFair ? "Pricing is aligned with market. Negotiate terms, not price." : "Proceed with diligence — understand why it is priced below market."}
                </div>

                {/* Fair value + ask */}
                <div style={{ display: "flex", gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>Fair Value</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#10B981", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(results.valuation.fairValue)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>Current Ask</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: heroColor, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(askPrice)}</div>
                  </div>
                </div>

                {/* Score bar */}
                {(() => {
                  const m = results.valuation.multiple;
                  const markerX = Math.min(290, Math.max(10,
                    m < 1.0  ? 10 + (m / 1.0) * 48 :
                    m < 1.15 ? 60 + ((m - 1.0) / 0.15) * 58 :
                    m < 1.30 ? 120 + ((m - 1.15) / 0.15) * 72 :
                    194 + Math.min(96, ((m - 1.30) / 0.5) * 96)
                  ));
                  return (
                    <div style={{ marginTop: 16 }}>
                      <svg viewBox="0 0 300 28" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: 28, display: "block" }}>
                        <rect x="0"   y="8" width="58"  height="12" rx="2" fill="#EAF3DE"/>
                        <rect x="60"  y="8" width="58"  height="12" rx="2" fill="#E6F1FB"/>
                        <rect x="120" y="5" width="72"  height="18" rx="3" fill="#FAEEDA"/>
                        <rect x="194" y="8" width="106" height="12" rx="2" fill="#FCEBEB"/>
                        <text x="29"  y="7" fontSize="8" fill="#3B6D11" textAnchor="middle" fontFamily="sans-serif">Under</text>
                        <text x="89"  y="7" fontSize="8" fill="#185FA5" textAnchor="middle" fontFamily="sans-serif">Fair</text>
                        <text x="156" y="7" fontSize="8" fill="#854F0B" textAnchor="middle" fontFamily="sans-serif">Mod. Over</text>
                        <text x="247" y="7" fontSize="8" fill="#A32D2D" textAnchor="middle" fontFamily="sans-serif">High Over</text>
                        <circle cx={markerX} cy="14" r="7" fill={heroColor}/>
                        <text x={markerX} y="18" fontSize="7" fill="white" textAnchor="middle" fontWeight="500" fontFamily="sans-serif">{results.valuation.multiple.toFixed(2)}</text>
                      </svg>
                    </div>
                  );
                })()}

              {/* Right: 4 metric cards stacked */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 150 }}>
                {[
                  { label: "ASK MULTIPLE",     value: results.valuation.multiple.toFixed(2) + "x", color: heroColor },
                  { label: "FAIR MULTIPLE",     value: ((results.valuation.marketRange[0] + results.valuation.marketRange[1]) / 2).toFixed(2) + "x", color: "#E2E8F0" },
                  { label: "PRICING GAP",       value: (gapVsMid > 0 ? "+" : "") + gapVsMid + "%", color: isOverpriced ? "#D85A30" : "#10B981" },
                  { label: "MARKET CONDITION",  value: results.marketRisk.industryGrowth === "Growing" ? "Favorable" : results.marketRisk.industryGrowth === "Volatile" ? "Volatile" : "Buyer pressure", color: "#94A3B8" },
                ].map((m) => (
                  <div key={m.label} style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{m.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: m.color, fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── SECTION 2: SUGGESTED OFFER RANGE ── */}
          <div className="fu fd1" style={{ background: "rgba(255,255,255,0.025)", border: "2px solid rgba(245,158,11,0.4)", borderRadius: 16, padding: "22px 24px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Suggested Offer Range</div>
              <div style={{ fontSize: 11, color: "#6B7280" }}>Based on closed comps · current market conditions</div>
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#10B981", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.01em", marginBottom: 14 }}>
              {fmt(results.valuation.recommendedOffer[0])} – {fmt(results.valuation.recommendedOffer[1])}
            </div>
            <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>Anchor Offer</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(results.valuation.recommendedOffer[0])}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>Walk-Away</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#D85A30", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(walkAway)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>Implied Discount</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#10B981", fontFamily: "'JetBrains Mono', monospace" }}>
                  {impliedDiscountLow}% to {impliedDiscountHigh}%
                </div>
              </div>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.06)", fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>
              {isOverpriced
                ? `If seller holds at ${fmt(askPrice)}, explore seller financing or earnout on the gap. Do not close above walk-away without extraordinary justification.`
                : `Pricing is close to market. Negotiate on terms — working capital, transition period, and deal structure — rather than leading with a price cut.`}
            </div>
          </div>

          {/* ── SECTION 3: PRICE VS MARKET REALITY ── */}
          <div className="fu fd2" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "22px 24px", marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 14 }}>Price vs Market Reality</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { label: "LOW COMP",              val: results.valuation.fairValueLow,  sub: `@ ${results.valuation.marketRange[0].toFixed(1)}x SDE`, highlight: false },
                { label: "MEDIAN\nMARKET ANCHOR", val: results.valuation.fairValue,     sub: `@ ${((results.valuation.marketRange[0]+results.valuation.marketRange[1])/2).toFixed(2)}x SDE`, highlight: true },
                { label: "HIGH COMP",             val: results.valuation.fairValueHigh, sub: `@ ${results.valuation.marketRange[1].toFixed(1)}x SDE`, highlight: false },
              ].map(({ label, val, sub, highlight }) => (
                <div key={label} style={{ padding: "14px", borderRadius: 10, background: highlight ? "rgba(245,158,11,0.04)" : "rgba(255,255,255,0.02)", border: highlight ? "2px solid rgba(245,158,11,0.35)" : "0.5px solid rgba(255,255,255,0.07)" }}>
                  {highlight && <div style={{ fontSize: 9, color: "#854F0B", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2, fontWeight: 700 }}>MEDIAN</div>}
                  <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4, whiteSpace: "pre-line" }}>{highlight ? "MARKET ANCHOR" : label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: highlight ? "#BA7517" : "#E2E8F0", fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>{fmt(val)}</div>
                  <div style={{ fontSize: 10, color: "#6B7280" }}>{sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>Asking Price</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: heroColor, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(askPrice)}</div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>vs {fmt(results.valuation.fairValue)} median</div>
              </div>
              <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: pillColor.bg, color: pillColor.text }}>
                {results.valuation.rangePosition}
              </div>
            </div>
          </div>

          {/* ── SECTION 4: WHY THIS DEAL IS RISKY ── */}
          <div className="fu fd3" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "22px 24px", marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 14 }}>Why This Deal Is Risky</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Asking price is above where comparable deals are actually closing in this market.",
                "Closed comps show consistent overpayment — buyers in this segment are not getting what they pay for.",
                "Downside risk accelerates if revenue growth assumptions don't materialize post-close.",
              ].map((text, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: i === 0 ? "#D85A30" : "#BA7517", flexShrink: 0, marginTop: 6 }} />
                  <span style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6 }}>{text}</span>
                </div>
              ))}
              {/* Also show computed red flags */}
              {results.redFlags.slice(0, 2).map((flag, i) => (
                <div key={"rf" + i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: "#BA7517", flexShrink: 0, marginTop: 6 }} />
                  <span style={{ fontSize: 12, color: "#8896A6", lineHeight: 1.6 }}>{flag}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── SECTION 5: WHERE THE MARKET IS MISPRICED ── */}
          <div className="fu fd4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "22px 24px", marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 4 }}>Where the Market Is Mispriced Right Now</div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 14 }}>
              Capital is overpaying in HVAC and {indLabel} — but real opportunities exist in Pest Control.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 130px", gap: "0 8px" }}>
              <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", paddingBottom: 8, borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}>Industry</div>
              <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", paddingBottom: 8, borderBottom: "0.5px solid rgba(255,255,255,0.07)", textAlign: "right" }}>Gap</div>
              <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", paddingBottom: 8, borderBottom: "0.5px solid rgba(255,255,255,0.07)", textAlign: "right" }}>Signal</div>
              {marketSignalRows.map((row, i) => (
                <React.Fragment key={i}>
                  <div style={{ padding: "9px 6px", background: row.rowBg !== "transparent" ? row.rowBg : undefined, borderRadius: i === 0 || i === 1 ? 0 : undefined, fontSize: 13, fontWeight: row.rowBg !== "transparent" ? 600 : 400, color: row.rowBg !== "transparent" ? (row.rowBg === "#FCEBEB" ? "#993C1D" : row.rowBg === "#FAEEDA" ? "#854F0B" : row.rowBg === "#EAF3DE" ? "#3B6D11" : "#185FA5") : "#E2E8F0", borderBottom: i < marketSignalRows.length - 1 ? "0.5px solid rgba(255,255,255,0.04)" : "none" }}>
                    {row.industry}
                  </div>
                  <div style={{ padding: "9px 6px", textAlign: "right", background: row.rowBg !== "transparent" ? row.rowBg : undefined, fontSize: 13, fontWeight: row.rowBg !== "transparent" ? 600 : 400, color: row.rowBg !== "transparent" ? (row.rowBg === "#FCEBEB" ? "#993C1D" : row.rowBg === "#FAEEDA" ? "#854F0B" : "#3B6D11") : "#6B7280", borderBottom: i < marketSignalRows.length - 1 ? "0.5px solid rgba(255,255,255,0.04)" : "none" }}>
                    {row.gap > 0 ? "+" : ""}{row.gap}%
                  </div>
                  <div style={{ padding: "9px 6px", textAlign: "right", background: row.rowBg !== "transparent" ? row.rowBg : undefined, borderBottom: i < marketSignalRows.length - 1 ? "0.5px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: row.signalBg, color: row.signalColor }}>
                      {row.signal}
                    </span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* ── SECTION 6: DEAL SNAPSHOT ── */}
          <div className="fu fd5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "22px 24px", marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 14 }}>Deal Snapshot</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 90px 100px 90px", gap: "0 8px", fontVariantNumeric: "tabular-nums" }}>
              {["Industry","SDE","Asking","Fair Value","Signal"].map((h) => (
                <div key={h} style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", paddingBottom: 8, borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}>{h}</div>
              ))}
              <div style={{ padding: "12px 0", fontSize: 13, fontWeight: 600, color: "#E2E8F0", borderBottom: "none" }}>{indLabel}</div>
              <div style={{ padding: "12px 0", fontSize: 13, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(parseFloat(inputs.sde.replace(/,/g,"")))}</div>
              <div style={{ padding: "12px 0", fontSize: 13, fontWeight: 600, color: heroColor, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(askPrice)}</div>
              <div style={{ padding: "12px 0", fontSize: 13, color: "#10B981", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(results.valuation.fairValue)}</div>
              <div style={{ padding: "12px 0" }}>
                <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: pillColor.bg, color: pillColor.text }}>
                  {pillLabel}
                </span>
              </div>
            </div>
          </div>

          {/* ── SECTION 7: WHAT SHOULD YOU DO ── */}
          <div className="fu fd6" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderLeft: `3px solid ${heroColor}`, borderRadius: 16, padding: "22px 24px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>What Should You Do?</div>
              <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: pillColor.bg, color: pillColor.text }}>
                {results.nextStep === "advance" ? "Proceed to next step" : results.nextStep === "validate" ? "Validate key assumptions" : "Renegotiate before proceeding"}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                isOverpriced ? "Price needs to come down 15–25% to align with where comparable deals are closing." : isFair ? "Pricing is fair — focus diligence on earnings quality, add-backs, and customer concentration." : "Below-market pricing may reflect risk — investigate seller motivation before proceeding.",
                "Validate 3 years of tax returns and add-backs before accepting any seller SDE claim.",
                isOverpriced ? `If seller won't move, negotiate seller financing on the gap above ${fmt(walkAway)} walk-away.` : "Confirm DSCR holds under a 10–15% revenue stress scenario before submitting LOI.",
              ].map((text, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: i === 0 ? "#D85A30" : "#BA7517", flexShrink: 0, marginTop: 6 }} />
                  <span style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── DEAL MEMO (AI sections) ── */}
          {aiLoading ? (
            <div className="fu fd6" style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.12)", borderRadius: 14, padding: "24px 22px", marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#818CF8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 600 }}>Deal Screening Memo</div>
              <div style={{ fontSize: 13, color: "#A5B4FC", fontStyle: "italic" }}>Composing decision-intelligence memo...</div>
            </div>
          ) : dealMemo ? (
            <>
              <div className="fu fd6" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 22px", marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14, fontWeight: 600 }}>Deal Positioning</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Market Position",      value: dealMemo.positioning.marketPosition, color: dealMemo.positioning.marketPosition === "Above Market" ? "#F59E0B" : dealMemo.positioning.marketPosition === "Below Market" ? "#10B981" : "#3B82F6" },
                    { label: "Buyer Fit",            value: dealMemo.positioning.buyerFit,       color: "#C4B5FD" },
                    { label: "Execution Difficulty", value: dealMemo.positioning.executionDifficulty, color: dealMemo.positioning.executionDifficulty === "High" ? "#F97316" : dealMemo.positioning.executionDifficulty === "Low" ? "#10B981" : "#F59E0B" },
                    { label: "Negotiation Leverage", value: dealMemo.positioning.negotiationLeverage, color: dealMemo.positioning.negotiationLeverage === "High" ? "#10B981" : dealMemo.positioning.negotiationLeverage === "Low" ? "#F97316" : "#F59E0B" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="fu fd6" style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.14)", borderRadius: 14, padding: "18px 22px", marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#818CF8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14, fontWeight: 600 }}>Deal Assessment</div>
                {[{ label: "Pricing Context", text: dealMemo.pricingContext }, { label: "Business Quality", text: dealMemo.businessQuality }, { label: "Buyer Interpretation", text: dealMemo.buyerInterpretation }].map(({ label, text }, i) => (
                  <div key={label} style={{ marginBottom: i < 2 ? 14 : 0, paddingBottom: i < 2 ? 14 : 0, borderBottom: i < 2 ? "1px solid rgba(99,102,241,0.1)" : "none" }}>
                    <div style={{ fontSize: 10, color: "#6366F1", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>{label}</div>
                    <p style={{ margin: 0, fontSize: 13, color: "#C4B5FD", lineHeight: 1.7 }}>{text}</p>
                  </div>
                ))}
              </div>

              <div className="fu fd6" style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 14, padding: "18px 22px", marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#F59E0B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>What Must Be True</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {dealMemo.whatMustBeTrue.map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 11, color: "#F59E0B", fontWeight: 700, flexShrink: 0, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{i + 1}</span>
                      <span style={{ fontSize: 12, color: "#FBBF24", lineHeight: 1.6 }}>{a}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="fu fd6" style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 14, padding: "18px 22px", marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#3B82F6", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>Buyer Decision Path</div>
                <div style={{ marginBottom: 12 }}>
                  {dealMemo.decisionPath.steps.map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 7 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 10, background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#3B82F6", flexShrink: 0 }}>{i + 1}</div>
                      <span style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5, paddingTop: 2 }}>{step}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[{ prefix: "If validated →", text: dealMemo.decisionPath.ifValidated, color: "#10B981", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.2)" }, { prefix: "If not →", text: dealMemo.decisionPath.ifNot, color: "#F97316", bg: "rgba(249,115,22,0.06)", border: "rgba(249,115,22,0.2)" }].map(({ prefix, text, color, bg, border }) => (
                    <div key={prefix} style={{ padding: "10px 14px", borderRadius: 8, background: bg, border: `1px solid ${border}` }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color, marginRight: 6 }}>{prefix}</span>
                      <span style={{ fontSize: 12, color: "#94A3B8" }}>{text.replace(/^if (validated|not)[^→]*→\s*/i, "")}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="fu fd6" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 14, padding: "18px 22px", marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>Negotiation Playbook</div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Anchor Range</div>
                  <div style={{ fontSize: 13, color: "#6EE7B7", lineHeight: 1.5 }}>{dealMemo.negotiationPlaybook.anchorRange}</div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Structure Ideas</div>
                  {dealMemo.negotiationPlaybook.structureIdeas.map((idea, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 5 }}>
                      <span style={{ color: "#10B981", fontSize: 11, flexShrink: 0 }}>→</span>
                      <span style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>{idea}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "8px 12px", borderRadius: 7, background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.18)" }}>
                  <span style={{ fontSize: 10, color: "#F97316", fontWeight: 600, textTransform: "uppercase", marginRight: 6 }}>Walk-Away</span>
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>{dealMemo.negotiationPlaybook.walkAway}</span>
                </div>
              </div>

              <div className="fu fd6" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.14)", borderRadius: 14, padding: "18px 22px", marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>Deal Breakers</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {dealMemo.dealBreakers.map((risk, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 11, color: "#EF4444", flexShrink: 0, marginTop: 2 }}>✕</span>
                      <span style={{ fontSize: 12, color: "#FCA5A5", lineHeight: 1.5 }}>{risk}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="fu fd6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 18px", marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5, fontWeight: 600 }}>Confidence & Limitations</div>
                <p style={{ margin: 0, fontSize: 12, color: "#6B7280", lineHeight: 1.6 }}>{dealMemo.confidenceNote}</p>
              </div>
            </>
          ) : null}

          {/* ── Three-lens confidence ── */}
          {results.threeLens && (
            <div className="fu fd7" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(99,102,241,0.06) 100%)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 14, padding: "22px 24px", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ padding: "3px 10px", borderRadius: 6, background: results.threeLens.confidence.overall === "HIGH" ? "rgba(16,185,129,0.15)" : results.threeLens.confidence.overall === "MEDIUM" ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)", fontSize: 11, fontWeight: 700, color: results.threeLens.confidence.overall === "HIGH" ? "#10B981" : results.threeLens.confidence.overall === "MEDIUM" ? "#F59E0B" : "#EF4444" }}>
                  CONFIDENCE: {results.threeLens.confidence.overall}
                </div>
                <span style={{ fontSize: 12, color: "#8896A6" }}>Three-lens market intelligence</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {[{ icon: "📊", label: "Listings", ...results.threeLens.confidence.listing }, { icon: "💰", label: "Transactions", ...results.threeLens.confidence.transaction }, { icon: "🏦", label: "Financial", ...results.threeLens.confidence.financial }].map((lens) => (
                  <div key={lens.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12 }}>{lens.icon}</span>
                    <span style={{ fontSize: 11, color: lens.grade === "HIGH" ? "#10B981" : lens.grade === "MEDIUM" ? "#F59E0B" : lens.grade === "LOW" ? "#F97316" : "#6B7280", fontWeight: 600, minWidth: 16 }}>●</span>
                    <span style={{ fontSize: 12, color: "#94A3B8" }}>{lens.description}</span>
                  </div>
                ))}
              </div>
              {results.threeLens.transaction && (
                <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: "#6B7280" }}>Typical sale-to-ask ratio</span><span style={{ color: "#E2E8F0", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{(results.threeLens.transaction.saleToAskRatio * 100).toFixed(0)}%</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}><span style={{ color: "#6B7280" }}>Median days on market</span><span style={{ color: "#E2E8F0", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{results.threeLens.transaction.daysOnMarket} days</span></div>
                  {results.threeLens.sellerBuyerGap !== null && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}><span style={{ color: "#6B7280" }}>Seller-buyer gap</span><span style={{ color: "#F59E0B", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{results.threeLens.sellerBuyerGap.toFixed(0)}% overask typical</span></div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── SECTION 8: GET FULL UNDERWRITING REPORT CTA ── */}
          <div className="fu fd7" style={{ background: "rgba(255,255,255,0.025)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px", marginBottom: 14 }}>
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#E2E8F0", marginBottom: 4 }}>Get Full Underwriting Report</div>
              <div style={{ fontSize: 13, color: "#6B7280" }}>DSCR model · downside scenarios · negotiation strategy · SBA loan estimate</div>
            </div>
            <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)", paddingTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href="/deal-check" style={{ display: "inline-block", padding: "11px 22px", borderRadius: 10, background: "#185FA5", color: "#E6F1FB", fontSize: 14, fontWeight: 600, textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}>
                Get Full Underwriting Report →
              </a>
              <button onClick={() => { setShowResults(false); setResults(null); setDealMemo(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ padding: "11px 18px", borderRadius: 10, border: "0.5px solid rgba(255,255,255,0.1)", background: "transparent", color: "#6B7280", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                Analyze another deal ↗
              </button>
            </div>
          </div>

          {/* ── SECTION 9: SHARE & BENCHMARK ── */}
          <div className="fu fd8" style={{ background: "linear-gradient(135deg, rgba(15,20,30,0.9) 0%, rgba(20,25,38,0.95) 100%)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "28px 24px", marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 10 }}>Share & Benchmark</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#E2E8F0", marginBottom: 6, lineHeight: 1.25 }}>Pressure Test Your Deal Publicly</div>
            <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 22, lineHeight: 1.6 }}>
              See how your deal compares and get real feedback from buyers, operators, and investors.
            </div>

            {dealPageUrl ? (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: "#818CF8", wordBreak: "break-all" }}>
                    nextax.ai{dealPageUrl}
                  </span>
                  <button onClick={() => { navigator.clipboard.writeText(`https://nextax.ai${dealPageUrl}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.1)", color: "#818CF8", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>
                    {copied ? "✓ Copied" : "Copy Link"}
                  </button>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
                  <button onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://nextax.ai${dealPageUrl}`)}`, "_blank")} style={{ flex: 1, minWidth: 120, padding: "10px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#94A3B8", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                    💼 LinkedIn
                  </button>
                  <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just screened a ${indLabel} acquisition on NexTax — Deal Score: ${results.overall}/100 (${results.riskLevel} Risk). Free screening tool:`)}&url=${encodeURIComponent(`https://nextax.ai${dealPageUrl}`)}`, "_blank")} style={{ flex: 1, minWidth: 120, padding: "10px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#94A3B8", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                    🐦 Twitter / X
                  </button>
                  <button onClick={handleShareImage} style={{ flex: 1, minWidth: 120, padding: "10px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#94A3B8", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                    🖼️ Score Card
                  </button>
                </div>
              </>
            ) : (
              <button onClick={() => results && createDealPage(results)} style={{ width: "100%", padding: "13px", borderRadius: 10, border: "1px solid rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.08)", color: "#818CF8", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginBottom: 18 }}>
                Share & Get Market Feedback →
              </button>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>⚡</span>
              <span style={{ fontSize: 12, color: "#FBBF24", lineHeight: 1.5 }}>
                Shared deals receive <strong style={{ color: "#F59E0B" }}>3–5x more feedback</strong> and benchmarking data from the NexTax buyer network.
              </span>
            </div>
          </div>

          <p style={{ fontSize: 11, color: "#4B5563", marginTop: 16, lineHeight: 1.5, textAlign: "center" }}>
            This tool provides a preliminary screening based on market benchmarks. Not financial or legal advice.
          </p>
        </div>
      )}

      {!showResults && !showGate && (
        <div style={{ textAlign: "center", padding: 24, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 12, color: "#4B5563", marginBottom: 8 }}>Trusted by acquisition entrepreneurs</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
            {["Paste any listing", "AI extraction", "Instant screening", "41 industries", "Shareable scores"].map((t) => <span key={t} style={{ fontSize: 11, color: "#374151" }}>✓ {t}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}
