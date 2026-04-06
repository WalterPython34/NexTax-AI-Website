"use client";

import React, { useState, useRef } from "react";
import jsPDF from "jspdf";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface DealInputs {
  revenue: string;
  sde: string;
  askingPrice: string;
  industry: string;
  city: string;
  state: string;
  zipCode: string;
  debtPercent: string;
  interestRate: string;
  loanTermYears: string;
  downPaymentSource: string;
  hasRealEstate: boolean;
  ownerOperated: boolean;
  yearsInBusiness: string;
  employeeCount: string;
  revenueGrowth: string;
  customerConcentration: string;
}

interface StressScenario {
  label: string;
  revenueDropPct: number;
  newRevenue: number;
  newSde: number;
  newDscr: number;
  newFairValue: number;
  dscrPass: boolean;
  verdict: string;
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

interface FullScoreBreakdown {
  overall: number;
  riskLevel: "Low" | "Moderate" | "High" | "Critical";
  nextStep: "advance" | "validate" | "reprice";

  valuation: {
    score: number;
    scoreExplanation: string;
    multiple: number;
    marketRange: [number, number];
    fairValueEstimate: number;
    fairValueLow: number;
    fairValueHigh: number;
    rangePosition: "Below Range" | "Within Range" | "Above Range";
    recommendedOffer: [number, number];
    verdict: string;
    flags: string[];
  };
  debtRisk: {
    score: number;
    scoreExplanation: string;
    dscr: number;
    annualPayment: number;
    monthlyPayment: number;
    loanAmount: number;
    downPayment: number;
    breakEvenMonths: number;
    verdict: string;
    flags: string[];
  };
  marketRisk: {
    score: number;
    scoreExplanation: string;
    industryGrowth: string;
    saturationLevel: string;
    verdict: string;
    flags: string[];
  };
  industryRisk: {
    score: number;
    scoreExplanation: string;
    marginRange: [number, number];
    verdict: string;
    flags: string[];
  };
  operationalRisk: {
    score: number;
    scoreExplanation: string;
    verdict: string;
    flags: string[];
  };
  benchmarks: {
    typicalMargin: [number, number];
    actualMargin: number;
    typicalMultiple: [number, number];
    revenuePerEmployee: number;
    industryAvgRevenuePerEmployee: number;
    laborRatio: string;
  };
  stressTests: StressScenario[];
  redFlags: string[];
  greenFlags: string[];
  aiInsight: string | null;
  dealMemo: DealMemo | null;
  threeLens?: {
    listing: { medianMultiple: number; sampleSize: number } | null;
    transaction: { cashflowMultiple: number; saleToAskRatio: number; daysOnMarket: number; reportedSales: number; subsector: string; medianSalePrice: number } | null;
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

// ─── INDUSTRY DATA ────────────────────────────────────────────────────────────

const INDUSTRIES: Record<string, {
  label: string;
  typicalMultiple: [number, number];
  benchmarkLow: number;
  benchmarkMid: number;
  benchmarkHigh: number;
  marginRange: [number, number];
  growth: string;
  riskFactor: number;
  avgRevenuePerEmployee: number;
  laborRatioRange: string;
  category: string;
  demandScore: number;
  buyerInterestRank: number;
  competitionLevel: string;
  sampleSize: number;
  benchmarkSource: string;
}> = {
  laundromat:     { label:"Laundromat",              typicalMultiple:[2.5,4.0], benchmarkLow:2.8,  benchmarkMid:3.48, benchmarkHigh:4.4,  marginRange:[25,40], growth:"Stable",   riskFactor:0.85, avgRevenuePerEmployee:120000, laborRatioRange:"15-25%", category:"Service",               demandScore:82, buyerInterestRank:3,  competitionLevel:"Moderate",      sampleSize:112, benchmarkSource:"DealStats" },
  hvac:           { label:"HVAC",                    typicalMultiple:[2.5,4.5], benchmarkLow:1.8,  benchmarkMid:2.45, benchmarkHigh:3.2,  marginRange:[15,30], growth:"Growing",  riskFactor:0.75, avgRevenuePerEmployee:95000,  laborRatioRange:"30-45%", category:"Trades",                demandScore:88, buyerInterestRank:2,  competitionLevel:"Low-Moderate",  sampleSize:312, benchmarkSource:"DealStats" },
  landscaping:    { label:"Landscaping",             typicalMultiple:[1.5,3.0], benchmarkLow:1.7,  benchmarkMid:2.21, benchmarkHigh:2.9,  marginRange:[10,25], growth:"Stable",   riskFactor:0.90, avgRevenuePerEmployee:55000,  laborRatioRange:"40-55%", category:"Service",               demandScore:70, buyerInterestRank:7,  competitionLevel:"High",          sampleSize:189, benchmarkSource:"DealStats" },
  carwash:        { label:"Car Wash",                typicalMultiple:[3.0,5.0], benchmarkLow:2.0,  benchmarkMid:2.74, benchmarkHigh:3.6,  marginRange:[25,45], growth:"Growing",  riskFactor:0.80, avgRevenuePerEmployee:100000, laborRatioRange:"20-30%", category:"Service",               demandScore:79, buyerInterestRank:5,  competitionLevel:"Moderate",      sampleSize:98,  benchmarkSource:"DealStats" },
  dental:         { label:"Dental Practice",         typicalMultiple:[3.0,5.5], benchmarkLow:0.8,  benchmarkMid:1.30, benchmarkHigh:1.9,  marginRange:[20,40], growth:"Growing",  riskFactor:0.65, avgRevenuePerEmployee:180000, laborRatioRange:"25-35%", category:"Healthcare",            demandScore:74, buyerInterestRank:8,  competitionLevel:"Low",           sampleSize:167, benchmarkSource:"DealStats" },
  gym:            { label:"Gym / Fitness Center",    typicalMultiple:[2.0,4.0], benchmarkLow:1.8,  benchmarkMid:2.32, benchmarkHigh:3.0,  marginRange:[15,35], growth:"Stable",   riskFactor:0.95, avgRevenuePerEmployee:70000,  laborRatioRange:"30-40%", category:"Service",               demandScore:71, buyerInterestRank:9,  competitionLevel:"Moderate-High", sampleSize:178, benchmarkSource:"DealStats" },
  restaurant:     { label:"Restaurant",              typicalMultiple:[1.5,3.0], benchmarkLow:1.4,  benchmarkMid:1.85, benchmarkHigh:2.4,  marginRange:[5,15],  growth:"Volatile", riskFactor:1.10, avgRevenuePerEmployee:50000,  laborRatioRange:"30-40%", category:"Food",                  demandScore:65, buyerInterestRank:11, competitionLevel:"Very High",     sampleSize:892, benchmarkSource:"DealStats" },
  autorepair:     { label:"Auto Repair",             typicalMultiple:[2.0,3.5], benchmarkLow:1.6,  benchmarkMid:2.11, benchmarkHigh:2.8,  marginRange:[15,30], growth:"Stable",   riskFactor:0.85, avgRevenuePerEmployee:85000,  laborRatioRange:"30-40%", category:"Service",               demandScore:73, buyerInterestRank:6,  competitionLevel:"Moderate",      sampleSize:445, benchmarkSource:"DealStats" },
  cleaning:       { label:"Cleaning Service",        typicalMultiple:[1.5,3.0], benchmarkLow:1.8,  benchmarkMid:2.22, benchmarkHigh:2.9,  marginRange:[15,30], growth:"Growing",  riskFactor:0.80, avgRevenuePerEmployee:45000,  laborRatioRange:"45-60%", category:"Service",               demandScore:76, buyerInterestRank:4,  competitionLevel:"High",          sampleSize:267, benchmarkSource:"DealStats" },
  ecommerce:      { label:"Ecommerce Brand",         typicalMultiple:[2.5,4.5], benchmarkLow:1.9,  benchmarkMid:2.41, benchmarkHigh:3.1,  marginRange:[15,35], growth:"Variable", riskFactor:0.95, avgRevenuePerEmployee:250000, laborRatioRange:"10-20%", category:"Digital",               demandScore:83, buyerInterestRank:1,  competitionLevel:"Very High",     sampleSize:345, benchmarkSource:"DealStats" },
  saas:           { label:"SaaS Product",            typicalMultiple:[3.0,6.0], benchmarkLow:2.1,  benchmarkMid:2.60, benchmarkHigh:3.4,  marginRange:[60,85], growth:"Growing",  riskFactor:0.70, avgRevenuePerEmployee:200000, laborRatioRange:"40-55%", category:"Digital",               demandScore:91, buyerInterestRank:1,  competitionLevel:"High",          sampleSize:156, benchmarkSource:"DealStats" },
  insurance:      { label:"Insurance Agency",        typicalMultiple:[2.0,3.5], benchmarkLow:1.4,  benchmarkMid:1.82, benchmarkHigh:2.4,  marginRange:[20,40], growth:"Stable",   riskFactor:0.70, avgRevenuePerEmployee:150000, laborRatioRange:"25-35%", category:"Financial",             demandScore:68, buyerInterestRank:10, competitionLevel:"Low",           sampleSize:89,  benchmarkSource:"DealStats" },
  plumbing:       { label:"Plumbing",                typicalMultiple:[2.0,4.0], benchmarkLow:1.7,  benchmarkMid:2.30, benchmarkHigh:3.0,  marginRange:[15,30], growth:"Growing",  riskFactor:0.75, avgRevenuePerEmployee:90000,  laborRatioRange:"30-45%", category:"Trades",                demandScore:85, buyerInterestRank:3,  competitionLevel:"Low-Moderate",  sampleSize:198, benchmarkSource:"DealStats" },
  roofing:        { label:"Roofing",                 typicalMultiple:[1.5,3.5], benchmarkLow:1.7,  benchmarkMid:2.21, benchmarkHigh:2.9,  marginRange:[15,30], growth:"Stable",   riskFactor:0.90, avgRevenuePerEmployee:75000,  laborRatioRange:"35-50%", category:"Trades",                demandScore:72, buyerInterestRank:6,  competitionLevel:"Moderate",      sampleSize:134, benchmarkSource:"DealStats" },
  petcare:        { label:"Pet Care / Grooming",     typicalMultiple:[2.0,4.0], benchmarkLow:2.0,  benchmarkMid:2.46, benchmarkHigh:3.2,  marginRange:[20,40], growth:"Growing",  riskFactor:0.80, avgRevenuePerEmployee:60000,  laborRatioRange:"35-45%", category:"Service",               demandScore:77, buyerInterestRank:5,  competitionLevel:"Moderate",      sampleSize:223, benchmarkSource:"DealStats" },
  pharmacy:       { label:"Pharmacy",                typicalMultiple:[2.5,4.0], benchmarkLow:0.5,  benchmarkMid:0.66, benchmarkHigh:0.9,  marginRange:[18,30], growth:"Stable",   riskFactor:0.75, avgRevenuePerEmployee:300000, laborRatioRange:"15-25%", category:"Healthcare",            demandScore:62, buyerInterestRank:14, competitionLevel:"Low",           sampleSize:67,  benchmarkSource:"DealStats" },
  daycare:        { label:"Daycare / Childcare",     typicalMultiple:[2.0,4.0], benchmarkLow:1.9,  benchmarkMid:2.29, benchmarkHigh:3.0,  marginRange:[15,30], growth:"Growing",  riskFactor:0.80, avgRevenuePerEmployee:40000,  laborRatioRange:"50-65%", category:"Service",               demandScore:74, buyerInterestRank:10, competitionLevel:"Moderate",      sampleSize:134, benchmarkSource:"DealStats" },
  medspa:         { label:"Med Spa / Aesthetics",    typicalMultiple:[3.0,5.0], benchmarkLow:2.0,  benchmarkMid:2.75, benchmarkHigh:3.6,  marginRange:[25,45], growth:"Growing",  riskFactor:0.75, avgRevenuePerEmployee:120000, laborRatioRange:"25-35%", category:"Healthcare",            demandScore:80, buyerInterestRank:7,  competitionLevel:"Moderate",      sampleSize:89,  benchmarkSource:"DealStats" },
  accounting:     { label:"Accounting / Tax Firm",   typicalMultiple:[1.5,3.5], benchmarkLow:1.0,  benchmarkMid:1.30, benchmarkHigh:1.7,  marginRange:[30,55], growth:"Stable",   riskFactor:0.60, avgRevenuePerEmployee:110000, laborRatioRange:"40-55%", category:"Professional Services", demandScore:86, buyerInterestRank:3,  competitionLevel:"Low-Moderate",  sampleSize:134, benchmarkSource:"DealStats" },
  electrical:     { label:"Electrical Contractor",   typicalMultiple:[2.0,4.0], benchmarkLow:1.8,  benchmarkMid:2.40, benchmarkHigh:3.1,  marginRange:[15,30], growth:"Growing",  riskFactor:0.75, avgRevenuePerEmployee:90000,  laborRatioRange:"35-50%", category:"Trades",                demandScore:82, buyerInterestRank:5,  competitionLevel:"Low-Moderate",  sampleSize:156, benchmarkSource:"DealStats" },
  healthcare:     { label:"Healthcare / Home Health", typicalMultiple:[3.0,6.0], benchmarkLow:1.1,  benchmarkMid:1.72, benchmarkHigh:2.3,  marginRange:[15,35], growth:"Growing",  riskFactor:0.70, avgRevenuePerEmployee:70000,  laborRatioRange:"50-65%", category:"Healthcare",            demandScore:79, buyerInterestRank:6,  competitionLevel:"Moderate",      sampleSize:145, benchmarkSource:"DealStats" },
  transportation: { label:"Transportation / Trucking",typicalMultiple:[2.0,4.0], benchmarkLow:2.0,  benchmarkMid:2.65, benchmarkHigh:3.4,  marginRange:[10,25], growth:"Stable",   riskFactor:0.85, avgRevenuePerEmployee:130000, laborRatioRange:"30-45%", category:"Logistics",             demandScore:68, buyerInterestRank:11, competitionLevel:"Moderate",      sampleSize:112, benchmarkSource:"DealStats" },
  printing:       { label:"Printing / Marketing",    typicalMultiple:[1.5,3.0], benchmarkLow:1.4,  benchmarkMid:1.90, benchmarkHigh:2.5,  marginRange:[15,30], growth:"Variable", riskFactor:0.90, avgRevenuePerEmployee:85000,  laborRatioRange:"35-50%", category:"Service",               demandScore:55, buyerInterestRank:18, competitionLevel:"High",          sampleSize:78,  benchmarkSource:"DealStats" },
  storage:        { label:"Self-Storage",            typicalMultiple:[4.0,8.0], benchmarkLow:4.0,  benchmarkMid:5.50, benchmarkHigh:7.2,  marginRange:[40,65], growth:"Growing",  riskFactor:0.60, avgRevenuePerEmployee:200000, laborRatioRange:"5-15%",  category:"Real Estate",           demandScore:84, buyerInterestRank:4,  competitionLevel:"Moderate",      sampleSize:56,  benchmarkSource:"DealStats" },
  painting:       { label:"Painting Contractor",     typicalMultiple:[1.5,3.0], benchmarkLow:1.6,  benchmarkMid:2.05, benchmarkHigh:2.7,  marginRange:[15,30], growth:"Stable",   riskFactor:0.90, avgRevenuePerEmployee:65000,  laborRatioRange:"40-55%", category:"Trades",                demandScore:64, buyerInterestRank:15, competitionLevel:"High",          sampleSize:112, benchmarkSource:"DealStats" },
  security:       { label:"Security Services",       typicalMultiple:[2.5,4.5], benchmarkLow:1.4,  benchmarkMid:1.94, benchmarkHigh:2.6,  marginRange:[15,30], growth:"Growing",  riskFactor:0.75, avgRevenuePerEmployee:50000,  laborRatioRange:"55-70%", category:"Service",               demandScore:72, buyerInterestRank:9,  competitionLevel:"Low-Moderate",  sampleSize:89,  benchmarkSource:"DealStats" },
  // ── New 14 industries (DealStats-derived benchmarks) ─────────────────────────
  construction:    { label:"Other Construction",              typicalMultiple:[1.8,3.2], benchmarkLow:1.81, benchmarkMid:2.4,  benchmarkHigh:3.17, marginRange:[15,30], growth:"Stable",   riskFactor:0.88, avgRevenuePerEmployee:70000,  laborRatioRange:"35-50%", category:"Trades",                demandScore:72, buyerInterestRank:8,  competitionLevel:"Moderate",      sampleSize:323, benchmarkSource:"DealStats" },
  engineering:     { label:"Engineering Services",            typicalMultiple:[1.8,3.3], benchmarkLow:1.82, benchmarkMid:2.43, benchmarkHigh:3.34, marginRange:[20,40], growth:"Growing",  riskFactor:0.70, avgRevenuePerEmployee:130000, laborRatioRange:"40-55%", category:"Professional Services", demandScore:78, buyerInterestRank:6,  competitionLevel:"Low-Moderate",  sampleSize:165, benchmarkSource:"DealStats" },
  grocery:         { label:"Grocery Store",                   typicalMultiple:[1.6,3.3], benchmarkLow:1.57, benchmarkMid:2.27, benchmarkHigh:3.3,  marginRange:[10,15], growth:"Stable",   riskFactor:0.95, avgRevenuePerEmployee:200000, laborRatioRange:"20-30%", category:"Retail",                demandScore:60, buyerInterestRank:14, competitionLevel:"High",          sampleSize:97,  benchmarkSource:"DealStats" },
  hairsalon:       { label:"Hair Salon",                      typicalMultiple:[1.1,2.3], benchmarkLow:1.11, benchmarkMid:1.61, benchmarkHigh:2.33, marginRange:[15,30], growth:"Stable",   riskFactor:0.92, avgRevenuePerEmployee:45000,  laborRatioRange:"50-65%", category:"Service",               demandScore:65, buyerInterestRank:12, competitionLevel:"Very High",     sampleSize:420, benchmarkSource:"DealStats" },
  marketing:       { label:"Marketing Agency",                typicalMultiple:[1.8,3.1], benchmarkLow:1.8,  benchmarkMid:2.27, benchmarkHigh:3.15, marginRange:[20,35], growth:"Growing",  riskFactor:0.80, avgRevenuePerEmployee:110000, laborRatioRange:"45-60%", category:"Professional Services", demandScore:75, buyerInterestRank:7,  competitionLevel:"High",          sampleSize:93,  benchmarkSource:"DealStats" },
  pestcontrol:     { label:"Pest Control",                    typicalMultiple:[2.0,4.2], benchmarkLow:2.02, benchmarkMid:3.19, benchmarkHigh:4.24, marginRange:[20,35], growth:"Growing",  riskFactor:0.75, avgRevenuePerEmployee:80000,  laborRatioRange:"35-50%", category:"Service",               demandScore:80, buyerInterestRank:5,  competitionLevel:"Moderate",      sampleSize:128, benchmarkSource:"DealStats" },
  physicaltherapy: { label:"Physical Therapy / Chiropractic", typicalMultiple:[1.6,2.9], benchmarkLow:1.59, benchmarkMid:2.16, benchmarkHigh:2.9,  marginRange:[20,35], growth:"Growing",  riskFactor:0.72, avgRevenuePerEmployee:100000, laborRatioRange:"45-60%", category:"Healthcare",            demandScore:76, buyerInterestRank:7,  competitionLevel:"Moderate",      sampleSize:107, benchmarkSource:"DealStats" },
  propertymanage:  { label:"Property Management",             typicalMultiple:[1.9,3.1], benchmarkLow:1.86, benchmarkMid:2.38, benchmarkHigh:3.08, marginRange:[20,40], growth:"Growing",  riskFactor:0.72, avgRevenuePerEmployee:90000,  laborRatioRange:"40-55%", category:"Financial",             demandScore:79, buyerInterestRank:5,  competitionLevel:"Moderate",      sampleSize:365, benchmarkSource:"DealStats" },
  realestatebrok:  { label:"Real Estate Brokerage",           typicalMultiple:[1.7,2.6], benchmarkLow:1.66, benchmarkMid:2.08, benchmarkHigh:2.58, marginRange:[15,30], growth:"Variable", riskFactor:0.90, avgRevenuePerEmployee:120000, laborRatioRange:"30-45%", category:"Financial",             demandScore:62, buyerInterestRank:13, competitionLevel:"High",          sampleSize:39,  benchmarkSource:"DealStats" },
  remodeling:      { label:"Home Remodeling & Restoration",   typicalMultiple:[1.4,2.7], benchmarkLow:1.42, benchmarkMid:2.08, benchmarkHigh:2.74, marginRange:[15,25], growth:"Stable",   riskFactor:0.88, avgRevenuePerEmployee:75000,  laborRatioRange:"40-55%", category:"Trades",                demandScore:70, buyerInterestRank:9,  competitionLevel:"Moderate-High", sampleSize:226, benchmarkSource:"DealStats" },
  seniorcare:      { label:"Senior Care / Home Health",        typicalMultiple:[2.0,3.8], benchmarkLow:2.03, benchmarkMid:2.9,  benchmarkHigh:3.8,  marginRange:[10,20], growth:"Growing",  riskFactor:0.78, avgRevenuePerEmployee:55000,  laborRatioRange:"55-70%", category:"Healthcare",            demandScore:82, buyerInterestRank:4,  competitionLevel:"Moderate",      sampleSize:223, benchmarkSource:"DealStats" },
  signmaking:      { label:"Sign Manufacturing",               typicalMultiple:[1.9,3.3], benchmarkLow:1.94, benchmarkMid:2.45, benchmarkHigh:3.27, marginRange:[15,30], growth:"Stable",   riskFactor:0.85, avgRevenuePerEmployee:85000,  laborRatioRange:"35-50%", category:"Service",               demandScore:63, buyerInterestRank:13, competitionLevel:"Moderate",      sampleSize:378, benchmarkSource:"DealStats" },
  staffing:        { label:"Staffing / Recruiting",            typicalMultiple:[1.5,3.0], benchmarkLow:1.54, benchmarkMid:2.33, benchmarkHigh:2.98, marginRange:[15,25], growth:"Variable", riskFactor:0.88, avgRevenuePerEmployee:150000, laborRatioRange:"20-35%", category:"Professional Services", demandScore:68, buyerInterestRank:11, competitionLevel:"High",          sampleSize:138, benchmarkSource:"DealStats" },
  veterinary:      { label:"Veterinary Practice",              typicalMultiple:[2.4,4.1], benchmarkLow:2.39, benchmarkMid:3.01, benchmarkHigh:4.1,  marginRange:[15,30], growth:"Growing",  riskFactor:0.70, avgRevenuePerEmployee:120000, laborRatioRange:"40-55%", category:"Healthcare",            demandScore:81, buyerInterestRank:4,  competitionLevel:"Low-Moderate",  sampleSize:45,  benchmarkSource:"DealStats" },
};

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

// ─── SCORING ENGINE ───────────────────────────────────────────────────────────

function computeStressTests(
  sde: number,
  annualPayment: number,
  benchmarkMid: number,
  sdeMargin: number,
  revenue: number
): StressScenario[] {
  const scenarios = [
    { label: "Base Case",    revenueDropPct: 0  },
    { label: "-10% Revenue", revenueDropPct: 10 },
    { label: "-15% Revenue", revenueDropPct: 15 },
    { label: "Margin -5pts", revenueDropPct: -1 }, // margin compression
  ];

  return scenarios.map((s) => {
    let newRevenue: number;
    let newSde: number;

    if (s.revenueDropPct === -1) {
      // Margin compression: same revenue, margins compress by 5 percentage points
      newRevenue = revenue;
      const compressedMarginPct = Math.max(0, sdeMargin - 5);
      newSde = newRevenue * (compressedMarginPct / 100);
    } else {
      newRevenue = revenue * (1 - s.revenueDropPct / 100);
      newSde = newRevenue * (sdeMargin / 100);
    }

    const newDscr = annualPayment > 0 ? newSde / annualPayment : 99;
    const newFairValue = Math.round(newSde * benchmarkMid);
    const dscrPass = newDscr >= 1.25;

    let verdict = "";
    if (newDscr >= 1.5)       verdict = "Comfortable — debt coverage maintained";
    else if (newDscr >= 1.25) verdict = "Marginal — meets lender minimums";
    else if (newDscr >= 1.0)  verdict = "Stressed — below SBA threshold";
    else                       verdict = "Critical — cash flow cannot service debt";

    return {
      label: s.label,
      revenueDropPct: s.revenueDropPct,
      newRevenue: Math.round(newRevenue),
      newSde: Math.round(newSde),
      newDscr: +newDscr.toFixed(2),
      newFairValue,
      dscrPass,
      verdict,
    };
  });
}

function calculateFullScores(inputs: DealInputs): FullScoreBreakdown | null {
  const revenue     = parseFloat(inputs.revenue.replace(/,/g, ""));
  const sde         = parseFloat(inputs.sde.replace(/,/g, ""));
  const price       = parseFloat(inputs.askingPrice.replace(/,/g, ""));
  const debtPct     = parseFloat(inputs.debtPercent) / 100;
  const rate        = parseFloat(inputs.interestRate) / 100;
  const term        = parseFloat(inputs.loanTermYears);
  const industry    = INDUSTRIES[inputs.industry];
  const yearsInBiz  = parseFloat(inputs.yearsInBusiness) || 0;
  const employees   = parseFloat(inputs.employeeCount) || 1;

  if (!revenue || !sde || !price || !industry || isNaN(debtPct) || isNaN(rate) || isNaN(term)) return null;

  const redFlags: string[]   = [];
  const greenFlags: string[] = [];

  // ── VALUATION ──────────────────────────────────────────────────────────────
  const multiple = price / sde;
  const { benchmarkLow, benchmarkMid, benchmarkHigh, sampleSize, benchmarkSource } = industry;
  const fairValueLow  = Math.round(sde * benchmarkLow);
  const fairValue     = Math.round(sde * benchmarkMid);
  const fairValueHigh = Math.round(sde * benchmarkHigh);

  let rangePosition: "Below Range" | "Within Range" | "Above Range";
  if (multiple < benchmarkLow)       rangePosition = "Below Range";
  else if (multiple > benchmarkHigh) rangePosition = "Above Range";
  else                                rangePosition = "Within Range";

  let valuationScore: number;
  if (multiple <= benchmarkLow * 0.85)   valuationScore = Math.min(95, 85 + (benchmarkLow - multiple) / benchmarkLow * 20);
  else if (multiple <= benchmarkMid)      valuationScore = Math.min(90, 70 + (benchmarkMid - multiple) / benchmarkMid * 40);
  else if (multiple <= benchmarkHigh)     valuationScore = 70 - ((multiple - benchmarkMid) / (benchmarkHigh - benchmarkMid)) * 25;
  else                                    valuationScore = Math.max(5, 40 - ((multiple - benchmarkHigh) / benchmarkHigh) * 60);
  valuationScore = Math.round(Math.max(5, Math.min(98, valuationScore)));

  const pctAboveHigh = Math.round(((multiple / benchmarkHigh) - 1) * 100);
  const pctAboveMid  = Math.round(((multiple / benchmarkMid) - 1) * 100);

  let valuationScoreExplanation = "";
  if (rangePosition === "Above Range")
    valuationScoreExplanation = `Driven by ${pctAboveHigh}% premium above the ${benchmarkHigh.toFixed(2)}x top of observed ${industry.label} transactions`;
  else if (multiple > benchmarkMid)
    valuationScoreExplanation = `Pricing in upper range — ${pctAboveMid}% above median; earnings quality must support the premium`;
  else if (rangePosition === "Within Range")
    valuationScoreExplanation = `Pricing is within the observed ${benchmarkLow.toFixed(2)}–${benchmarkHigh.toFixed(2)}x range and at or below the median`;
  else
    valuationScoreExplanation = `Asking multiple is below the ${benchmarkLow.toFixed(2)}x low end — favorable entry but warrants seller motivation investigation`;

  const valuationFlags: string[] = [];
  if (rangePosition === "Above Range") {
    valuationFlags.push(`Asking ${multiple.toFixed(2)}x is ${pctAboveHigh}% above the ${benchmarkHigh.toFixed(2)}x high end of comparable ${industry.label} transactions`);
    redFlags.push(`Asking ${multiple.toFixed(2)}x appears ${pctAboveHigh}% above the ${benchmarkHigh.toFixed(2)}x high end of observed ${industry.label} transactions — requires justification through earnings quality or growth trajectory`);
  } else if (multiple > benchmarkMid * 1.05 && rangePosition === "Within Range") {
    valuationFlags.push(`Pricing in upper portion of the ${benchmarkLow.toFixed(2)}–${benchmarkHigh.toFixed(2)}x range — may require earnings quality justification`);
    redFlags.push(`Pricing in the upper portion of the observed range — earnings quality or growth trajectory must support the premium`);
  } else if (rangePosition === "Below Range") {
    valuationFlags.push(`Asking ${multiple.toFixed(2)}x is below the ${benchmarkLow.toFixed(2)}x low end — investigate seller motivation before assuming upside`);
    greenFlags.push(`Asking multiple of ${multiple.toFixed(2)}x is below the ${benchmarkLow.toFixed(2)}x low end of observed transactions — favorable pricing if financials hold`);
  } else {
    greenFlags.push(`Pricing is consistent with the ${benchmarkLow.toFixed(2)}–${benchmarkHigh.toFixed(2)}x range observed across ${sampleSize.toLocaleString()} comparable ${industry.label} transactions`);
  }

  const valuationVerdict =
    rangePosition === "Below Range"   ? `${multiple.toFixed(2)}x is below the observed low end of ${benchmarkLow.toFixed(2)}x — pricing appears favorable relative to market comps` :
    multiple <= benchmarkMid          ? `${multiple.toFixed(2)}x is within range and below the ${benchmarkMid.toFixed(2)}x median — consistent with market-rate entry` :
    rangePosition === "Within Range"  ? `${multiple.toFixed(2)}x is in the upper portion of the observed range — buyers should evaluate whether earnings quality supports the premium` :
    `${multiple.toFixed(2)}x appears above the ${benchmarkHigh.toFixed(2)}x high end of comparable transactions — ask may require negotiation or structural adjustment`;

  let recommendedOffer: [number, number];
  if (price <= fairValueLow)       recommendedOffer = [Math.round(price * 0.80), Math.round(price * 1.0)];
  else if (price <= fairValue)     recommendedOffer = [Math.round(price * 0.85), Math.round(price * 1.0)];
  else if (price <= fairValueHigh) recommendedOffer = [Math.round(fairValue * 0.90), fairValue];
  else                             recommendedOffer = [fairValueLow, fairValue];

  // ── DEBT / DSCR ────────────────────────────────────────────────────────────
  const loanAmount    = price * debtPct;
  const downPayment   = price - loanAmount;
  const monthlyRate   = rate / 12;
  const numPayments   = term * 12;
  const monthlyPayment = monthlyRate > 0
    ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
    : loanAmount / numPayments;
  const annualPayment  = monthlyPayment * 12;
  const dscr           = annualPayment > 0 ? sde / annualPayment : 99;
  const breakEvenMonths = Math.ceil(downPayment / (sde / 12 - monthlyPayment));

  let debtScore: number;
  if (dscr >= 2.0)       debtScore = 92;
  else if (dscr >= 1.5)  debtScore = 75 + (dscr - 1.5) * 34;
  else if (dscr >= 1.25) debtScore = 55 + (dscr - 1.25) * 80;
  else if (dscr >= 1.0)  debtScore = 30 + (dscr - 1.0) * 100;
  else                   debtScore = Math.max(5, dscr * 30);
  debtScore = Math.round(Math.max(5, Math.min(98, debtScore)));

  const debtScoreExplanation =
    dscr >= 2.0  ? `DSCR of ${dscr.toFixed(2)}x — coverage exceeds 2.0x threshold, strong SBA eligibility` :
    dscr >= 1.5  ? `DSCR of ${dscr.toFixed(2)}x — coverage is comfortable; ${Math.round((dscr - 1.25) * 100)}% buffer above lender minimum` :
    dscr >= 1.25 ? `DSCR of ${dscr.toFixed(2)}x — meets SBA minimum with limited buffer; sensitive to revenue variance` :
    dscr >= 1.0  ? `DSCR of ${dscr.toFixed(2)}x — below the 1.25x lender threshold; additional equity or structure adjustment needed` :
    `DSCR of ${dscr.toFixed(2)}x — cash flow does not cover debt service at proposed terms`;

  const debtFlags: string[] = [];
  if (dscr < 1.0) {
    debtFlags.push("Cash flow does not cover debt service at proposed terms");
    redFlags.push(`DSCR of ${dscr.toFixed(2)}x falls below 1.0 — deal cannot service its own debt at current terms`);
  } else if (dscr < 1.25) {
    debtFlags.push(`DSCR of ${dscr.toFixed(2)}x is below the 1.25x SBA minimum — financing terms may require adjustment`);
    redFlags.push(`Tight debt coverage at ${dscr.toFixed(2)}x — below standard lender threshold; no buffer for revenue variance`);
  } else if (dscr >= 1.5) {
    greenFlags.push(`DSCR of ${dscr.toFixed(2)}x provides comfortable coverage above lender minimums — supports SBA eligibility`);
  }
  if (downPayment > 0 && breakEvenMonths > 60) debtFlags.push("Down payment recovery exceeds 5 years");
  if (debtPct > 0.9) debtFlags.push("Very high leverage — minimal equity cushion");

  const debtVerdict =
    dscr >= 1.5  ? `DSCR of ${dscr.toFixed(2)}x — debt service is well-covered at proposed terms` :
    dscr >= 1.25 ? `DSCR of ${dscr.toFixed(2)}x — meets standard lender minimums with limited buffer` :
    dscr >= 1.0  ? `DSCR of ${dscr.toFixed(2)}x — marginal coverage; evaluate sensitivity to revenue variance` :
    `DSCR of ${dscr.toFixed(2)}x — projected cash flow does not service proposed debt at current terms`;

  // ── MARKET RISK ────────────────────────────────────────────────────────────
  const growthScores: Record<string, number> = { Growing: 82, Stable: 65, Variable: 45, Volatile: 28 };
  let marketScore = growthScores[industry.growth] || 50;
  const marketFlags: string[] = [];

  if (inputs.state) {
    const highGrowthStates = ["TX","FL","TN","NC","AZ","GA","CO","UT","ID","NV"];
    const decliningStates  = ["WV","MS","LA","AK"];
    if (highGrowthStates.includes(inputs.state)) { marketScore += 5; greenFlags.push("Located in high-growth state — favorable market tailwinds"); }
    if (decliningStates.includes(inputs.state))  { marketScore -= 5; marketFlags.push("State shows below-average economic growth indicators"); }
  }

  let saturationLevel = "Moderate";
  if (industry.category === "Service" || industry.category === "Trades") {
    saturationLevel = "Low-Moderate";
    marketFlags.push("Service businesses have natural geographic moats — limited national competition");
  } else if (industry.category === "Digital") {
    saturationLevel = "High";
    marketFlags.push("Digital businesses face national/global competition — no geographic moat");
  } else if (industry.category === "Food") {
    saturationLevel = "High";
    marketFlags.push("Restaurant industry has high competition and elevated failure rates");
    redFlags.push("Restaurants carry among the highest operational failure rates of any SMB category");
  }

  marketScore = Math.round(Math.max(10, Math.min(95, marketScore)));

  const marketScoreExplanation =
    industry.growth === "Growing"  ? `${industry.label} shows favorable demand indicators; ${inputs.state ? `${inputs.state} is a ${["TX","FL","TN","NC","AZ","GA","CO","UT","ID","NV"].includes(inputs.state) ? "high-growth" : "stable"} state market` : "national demand is steady"}` :
    industry.growth === "Volatile" ? `${industry.label} has historically exhibited volatile demand — revenue predictability is limited across economic cycles` :
    industry.growth === "Variable" ? `${industry.label} demand is variable — performance is sensitive to platform and macro conditions` :
    `${industry.label} demonstrates stable demand with predictable revenue patterns`;

  const marketVerdict =
    marketScore >= 70 ? "Favorable market conditions — supportive demand environment" :
    marketScore >= 50 ? "Stable market — predictable demand with manageable risk" :
    "Challenging market — elevated operational and cyclical risk";

  // ── INDUSTRY RISK ──────────────────────────────────────────────────────────
  let industryScore = Math.round(Math.max(15, Math.min(95, (1 - industry.riskFactor) * 100 + 40)));
  const industryFlags: string[] = [];
  const sdeMargin = (sde / revenue) * 100;
  const [lowMargin, highMargin] = industry.marginRange;

  if (sdeMargin < lowMargin * 0.7) {
    industryScore -= 10;
    industryFlags.push(`SDE margin of ${sdeMargin.toFixed(0)}% is significantly below the ${lowMargin}–${highMargin}% industry range`);
    redFlags.push(`SDE margin of ${sdeMargin.toFixed(0)}% is ${Math.round(lowMargin - sdeMargin)} points below the ${lowMargin}% industry floor — evaluate cost structure and add-back sustainability`);
  } else if (sdeMargin > highMargin * 1.1) {
    industryFlags.push(`Margins of ${sdeMargin.toFixed(0)}% are above the ${lowMargin}–${highMargin}% typical range — verify sustainability`);
    greenFlags.push(`Operating margin of ${sdeMargin.toFixed(0)}% exceeds the typical ${lowMargin}–${highMargin}% range, supporting earnings quality`);
  } else if (sdeMargin >= lowMargin) {
    greenFlags.push(`Operating margin of ${sdeMargin.toFixed(0)}% is consistent with ${industry.label} benchmarks (${lowMargin}–${highMargin}%)`);
  }

  industryScore = Math.round(Math.max(10, Math.min(95, industryScore)));

  const industryScoreExplanation =
    sdeMargin < lowMargin * 0.7  ? `Margins of ${sdeMargin.toFixed(0)}% are materially below the ${lowMargin}–${highMargin}% industry range — SDE credibility risk` :
    sdeMargin > highMargin * 1.1 ? `Margins of ${sdeMargin.toFixed(0)}% exceed typical range — strong but verify add-back sustainability` :
    `Margins of ${sdeMargin.toFixed(0)}% align with the ${lowMargin}–${highMargin}% industry benchmark; risk profile is typical for ${industry.label}`;

  const industryVerdict =
    industryScore >= 70 ? `${industry.label} presents below-average operational risk relative to SMB peers` :
    industryScore >= 45 ? `${industry.label} carries moderate operational and market risk — typical for this category` :
    `${industry.label} warrants elevated diligence given historical risk profile`;

  // ── OPERATIONAL RISK ───────────────────────────────────────────────────────
  let operationalScore = 65;
  const operationalFlags: string[] = [];
  const operationalDrivers: string[] = [];

  if (yearsInBiz >= 10) {
    operationalScore += 10;
    greenFlags.push(`Business has a ${Math.round(yearsInBiz)}-year operating track record — reduces execution risk`);
    operationalDrivers.push(`${Math.round(yearsInBiz)}-year track record supports earnings durability`);
  } else if (yearsInBiz >= 5) {
    operationalScore += 5;
    operationalDrivers.push(`${Math.round(yearsInBiz)}-year history provides moderate confidence in revenue sustainability`);
  } else if (yearsInBiz > 0 && yearsInBiz < 3) {
    operationalScore -= 10;
    operationalFlags.push(`Business is ${Math.round(yearsInBiz)} years old — limited track record increases earnings uncertainty`);
    redFlags.push(`Business under 3 years old — limited track record for revenue durability assessment`);
    operationalDrivers.push(`Young business (${Math.round(yearsInBiz)} yr) — unproven through a full economic cycle`);
  }

  if (inputs.ownerOperated) {
    operationalFlags.push("Owner-operated — transition risk if seller exits without structured handoff");
    operationalDrivers.push("Owner dependency creates transition risk; structured handoff plan is required");
  } else {
    operationalScore += 5;
    greenFlags.push("Not owner-dependent — management team in place reduces transition risk");
    operationalDrivers.push("Management layer reduces key-person dependency");
  }

  if (inputs.revenueGrowth === "declining") {
    operationalScore -= 15;
    redFlags.push("Revenue is declining — buyers should obtain 3-year trend data and understand root cause before LOI");
    operationalFlags.push("Declining revenue demands explanation — verify whether cause is cyclical, competitive, or structural");
    operationalDrivers.push("Declining revenue is the single largest risk driver for this deal");
  } else if (inputs.revenueGrowth === "growing") {
    operationalScore += 10;
    greenFlags.push("Revenue trend is positive — supports SDE sustainability and growth thesis");
    operationalDrivers.push("Growing revenue supports the SDE multiple and reduces earnings risk");
  } else {
    operationalFlags.push("Flat revenue — limited organic growth; buyer must evaluate whether this is stability or stagnation");
    operationalDrivers.push("Flat revenue creates dependency on cost control rather than top-line growth");
  }

  if (inputs.customerConcentration === "high") {
    operationalScore -= 12;
    redFlags.push("High customer concentration — single-point-of-failure risk; any large account loss would materially impact SDE");
    operationalFlags.push("Top customer represents an outsized revenue share — binding contract or diversification required");
    operationalDrivers.push("Customer concentration is a critical risk: one account loss could impair debt coverage");
  } else if (inputs.customerConcentration === "low") {
    operationalScore += 5;
    greenFlags.push("Diversified customer base reduces revenue concentration risk");
    operationalDrivers.push("Diversified revenue base supports SDE stability");
  }

  const revenuePerEmployee = employees > 0 ? revenue / employees : 0;
  if (revenuePerEmployee < industry.avgRevenuePerEmployee * 0.6) {
    operationalFlags.push(`Revenue per employee of ${fmt(revenuePerEmployee)} is below the ${fmt(industry.avgRevenuePerEmployee)} industry average — possible overstaffing`);
    operationalDrivers.push("Below-average revenue per employee may indicate overstaffing or margin compression risk");
  }

  operationalScore = Math.round(Math.max(5, Math.min(98, operationalScore)));

  const operationalScoreExplanation = operationalDrivers.length > 0
    ? operationalDrivers[0]
    : `Operational profile is consistent with a ${industry.label} acquisition at this size`;

  const operationalVerdict =
    operationalScore >= 70 ? "Strong operational profile — manageable transition risk" :
    operationalScore >= 45 ? "Moderate operational risk — manageable with planning and a structured transition" :
    "Significant operational concerns — require specific diligence and risk mitigation before advancing";

  // ── STRESS TESTS ───────────────────────────────────────────────────────────
  const stressTests = computeStressTests(sde, annualPayment, benchmarkMid, sdeMargin, revenue);

  // ── BENCHMARKS ─────────────────────────────────────────────────────────────
  const benchmarks = {
    typicalMargin: industry.marginRange,
    actualMargin:  Math.round(sdeMargin * 10) / 10,
    typicalMultiple: industry.typicalMultiple,
    revenuePerEmployee: Math.round(revenuePerEmployee),
    industryAvgRevenuePerEmployee: industry.avgRevenuePerEmployee,
    laborRatio: industry.laborRatioRange,
  };

  // ── OVERALL ────────────────────────────────────────────────────────────────
  const overall = Math.round(Math.max(5, Math.min(98,
    valuationScore  * 0.25 +
    debtScore       * 0.25 +
    marketScore     * 0.15 +
    industryScore   * 0.15 +
    operationalScore * 0.20
  )));

  const riskLevel: FullScoreBreakdown["riskLevel"] =
    overall >= 70 ? "Low" : overall >= 50 ? "Moderate" : overall >= 30 ? "High" : "Critical";

  const nextStep: FullScoreBreakdown["nextStep"] =
    overall >= 65 ? "advance" : overall >= 45 ? "validate" : "reprice";

  return {
    overall, riskLevel, nextStep,
    valuation: {
      score: valuationScore, scoreExplanation: valuationScoreExplanation,
      multiple, marketRange: [benchmarkLow, benchmarkHigh],
      fairValueEstimate: fairValue, fairValueLow, fairValueHigh,
      rangePosition, recommendedOffer,
      verdict: valuationVerdict, flags: valuationFlags,
    },
    debtRisk: {
      score: debtScore, scoreExplanation: debtScoreExplanation,
      dscr, annualPayment, monthlyPayment, loanAmount, downPayment,
      breakEvenMonths: breakEvenMonths > 0 ? breakEvenMonths : 0,
      verdict: debtVerdict, flags: debtFlags,
    },
    marketRisk: {
      score: marketScore, scoreExplanation: marketScoreExplanation,
      industryGrowth: industry.growth, saturationLevel,
      verdict: marketVerdict, flags: marketFlags,
    },
    industryRisk: {
      score: industryScore, scoreExplanation: industryScoreExplanation,
      marginRange: industry.marginRange,
      verdict: industryVerdict, flags: industryFlags,
    },
    operationalRisk: {
      score: operationalScore, scoreExplanation: operationalScoreExplanation,
      verdict: operationalVerdict, flags: operationalFlags,
    },
    benchmarks, stressTests, redFlags, greenFlags,
    aiInsight: null, dealMemo: null,
  };
}

// ─── UI HELPERS ───────────────────────────────────────────────────────────────

function fmt(v: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}
function sc(s: number): string {
  return s >= 70 ? "#10B981" : s >= 50 ? "#F59E0B" : s >= 30 ? "#F97316" : "#EF4444";
}
function getRiskBg(level: string): string {
  switch (level) {
    case "Low":      return "linear-gradient(135deg,#065F46,#10B981)";
    case "Moderate": return "linear-gradient(135deg,#92400E,#F59E0B)";
    case "High":     return "linear-gradient(135deg,#9A3412,#F97316)";
    case "Critical": return "linear-gradient(135deg,#991B1B,#EF4444)";
    default:         return "linear-gradient(135deg,#374151,#6B7280)";
  }
}
function renderMd(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/).map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} style={{ color: "#E2E8F0", fontWeight: 600 }}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

function ScoreRing({ score, size = 140, sw = 8 }: { score: number; size?: number; sw?: number }) {
  const r = (size - sw) / 2, c = r * 2 * Math.PI, o = c - (score / 100) * c, col = sc(score);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={sw} strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.2s ease-out" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 800, color: col, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: "#8896A6", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>Deal Score</span>
      </div>
    </div>
  );
}

function SBarExplained({ label, score, icon, explanation }: { label: string; score: number; icon: string; explanation: string }) {
  const col = sc(score);
  const riskLabel = score >= 70 ? "Low Risk" : score >= 50 ? "Moderate" : score >= 30 ? "High Risk" : "Critical";
  return (
    <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "#C9D1D9", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
          <span>{icon}</span>{label}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: col, fontWeight: 600 }}>{riskLabel}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: col, fontFamily: "'JetBrains Mono', monospace" }}>{score}</span>
        </div>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
        <div style={{ height: "100%", width: `${score}%`, background: col, borderRadius: 3, transition: "width 1s ease-out" }} />
      </div>
      <div style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.4 }}>→ {explanation}</div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, prefix, suffix, small }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; prefix?: string; suffix?: string; small?: boolean;
}) {
  return (
    <div style={{ marginBottom: small ? 0 : 16 }}>
      <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      <div style={{ position: "relative" }}>
        {prefix && <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6B7280", fontSize: 14 }}>{prefix}</span>}
        <input type="text" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
          style={{ width: "100%", padding: `10px ${suffix ? "36px" : "12px"} 10px ${prefix ? "26px" : "12px"}`, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
        {suffix && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#6B7280", fontSize: 12 }}>{suffix}</span>}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DealRiskAnalyzer() {
  const [gated, setGated]           = useState(true);
  const [gateEmail, setGateEmail]   = useState("");
  const [gateName, setGateName]     = useState("");
  const [gateLoading, setGateLoading] = useState(false);
  const [step, setStep]             = useState(1);
  const [inputs, setInputs]         = useState<DealInputs>({
    revenue: "", sde: "", askingPrice: "", industry: "",
    city: "", state: "", zipCode: "",
    debtPercent: "80", interestRate: "10.5", loanTermYears: "10",
    downPaymentSource: "savings", hasRealEstate: false, ownerOperated: true,
    yearsInBusiness: "", employeeCount: "", revenueGrowth: "flat", customerConcentration: "moderate",
  });
  const [results, setResults]       = useState<FullScoreBreakdown | null>(null);
  const [loading, setLoading]       = useState(false);
  const [memoLoading, setMemoLoading] = useState(false);
  const [dealMemo, setDealMemo]     = useState<DealMemo | null>(null);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [pdfOptions, setPdfOptions] = useState({ aiAssessment: true, benchmarks: true, stressTest: true });
  const resultsRef = useRef<HTMLDivElement>(null);

  const set = (field: keyof DealInputs, value: string | boolean) => setInputs((p) => ({ ...p, [field]: value }));
  const setCurrency = (field: keyof DealInputs, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    set(field, cleaned ? parseInt(cleaned).toLocaleString() : "");
  };

  const canProceedStep1 = !!(inputs.revenue && inputs.sde && inputs.askingPrice && inputs.industry);

  const handleGateSubmit = async () => {
    if (!gateEmail) return;
    setGateLoading(true);
    try {
      await fetch("/api/capture-lead", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: gateName, email: gateEmail, source: "risk-analyzer",
          industry: inputs.industry || null,
          dealScore: null,
          metadata: { revenue: inputs.revenue || null, sde: inputs.sde || null, asking_price: inputs.askingPrice || null, state: inputs.state || null },
        }),
      });
    } catch { /* non-blocking */ }
    setGated(false);
    setGateLoading(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const scores = calculateFullScores(inputs);
    if (scores) {
      setResults(scores);
      setDealMemo(null);
      setStep(4);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      fetchBenchmarks(scores);
      fetchDealMemo(scores);
      recordDeal(scores);
    }
    setLoading(false);
  };

  const fetchBenchmarks = async (scores: FullScoreBreakdown) => {
    try {
      const revenue = parseFloat(inputs.revenue.replace(/,/g, ""));
      const sde     = parseFloat(inputs.sde.replace(/,/g, ""));
      const price   = parseFloat(inputs.askingPrice.replace(/,/g, ""));
      const res = await fetch("/api/benchmark-lookup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry: inputs.industry, state: inputs.state || null, revenue, sde, asking_price: price }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;
      const b = data.benchmarks, a = data.analysis, c = data.confidence;
      setResults((prev) => {
        if (!prev) return prev;
        let newValScore    = prev.valuation.score;
        let newMarketRange = prev.valuation.marketRange;
        let newFairValue   = prev.valuation.fairValueEstimate;
        let newOverall     = prev.overall;
        if (b.transaction) {
          const txnMult = b.transaction.cashflowMultiple;
          newMarketRange = a.effectiveMultipleRange;
          newFairValue   = a.effectiveFairValue;
          const dealMult = a.dealMultiple;
          if (dealMult <= txnMult * 0.85)       newValScore = Math.min(95, 85 + (txnMult - dealMult) / txnMult * 20);
          else if (dealMult <= txnMult)          newValScore = Math.min(90, 70 + (txnMult - dealMult) / txnMult * 40);
          else if (dealMult <= txnMult * 1.15)   newValScore = 70 - ((dealMult - txnMult) / txnMult) * 50;
          else if (dealMult <= txnMult * 1.3)    newValScore = 50 - ((dealMult - txnMult * 1.15) / txnMult) * 60;
          else                                    newValScore = Math.max(5, 30 - ((dealMult - txnMult * 1.3) / txnMult) * 50);
          newValScore = Math.round(Math.max(5, Math.min(98, newValScore)));
          const w = c.weights;
          newOverall = Math.round(Math.max(5, Math.min(98,
            newValScore * (w.valuation / 100) +
            prev.debtRisk.score * (w.debt / 100) +
            prev.marketRisk.score * ((w.financial + w.liquidity) / 200) +
            prev.industryRisk.score * ((w.financial + w.liquidity) / 200)
          )));
        }
        const newRiskLevel: FullScoreBreakdown["riskLevel"] = newOverall >= 70 ? "Low" : newOverall >= 50 ? "Moderate" : newOverall >= 30 ? "High" : "Critical";
        const newRedFlags   = [...prev.redFlags];
        const newGreenFlags = [...prev.greenFlags];
        if (b.transaction && a.sellerBuyerGap && a.sellerBuyerGap > 20)
          newRedFlags.push(`Sellers in this industry typically overask by ${a.sellerBuyerGap.toFixed(0)}% — buyer should anchor well below list price`);
        if (b.transaction && b.transaction.saleToAskRatio < 0.90)
          newGreenFlags.push(`Comparable transactions closed at ~${Math.round((1 - b.transaction.saleToAskRatio) * 100)}% below asking — supports an anchored offer below list`);
        if (b.transaction && b.transaction.daysOnMarket > 250)
          newGreenFlags.push(`Median days on market of ${b.transaction.daysOnMarket} days indicates extended listing periods — buyer has negotiating leverage`);
        return {
          ...prev, overall: newOverall, riskLevel: newRiskLevel,
          valuation: { ...prev.valuation, score: newValScore, marketRange: newMarketRange, fairValueEstimate: newFairValue, recommendedOffer: a.smartOfferRange },
          redFlags: newRedFlags, greenFlags: newGreenFlags,
          threeLens: {
            listing: b.listing ? { medianMultiple: b.listing.medianMultiple, sampleSize: b.listing.sampleSize } : null,
            transaction: b.transaction ? { cashflowMultiple: b.transaction.cashflowMultiple, saleToAskRatio: b.transaction.saleToAskRatio, daysOnMarket: b.transaction.daysOnMarket, reportedSales: b.transaction.reportedSales, subsector: b.transaction.subsector, medianSalePrice: b.transaction.medianSalePrice } : null,
            financial: b.financial ? { sdeMargin: b.financial.sdeMargin } : null,
            sellerBuyerGap: a.sellerBuyerGap, estimatedNegotiatedPrice: a.estimatedNegotiatedPrice,
            smartOfferRange: a.smartOfferRange,
            confidence: { overall: c.overall, listing: { grade: c.listing.grade, description: c.listing.description, sampleSize: c.listing.sampleSize }, transaction: { grade: c.transaction.grade, description: c.transaction.description, sampleSize: c.transaction.sampleSize }, financial: { grade: c.financial.grade, description: c.financial.description, sampleSize: c.financial.sampleSize }, weights: c.weights },
          },
        };
      });
    } catch (err) { console.error("Benchmark fetch error:", err); }
  };

  const fetchDealMemo = async (scores: FullScoreBreakdown) => {
    setMemoLoading(true);
    setDealMemo(null);
    const ind       = INDUSTRIES[inputs.industry];
    const sdeMargin = inputs.revenue ? ((parseFloat(inputs.sde.replace(/,/g,"")) / parseFloat(inputs.revenue.replace(/,/g,""))) * 100).toFixed(1) : "N/A";
    const askPrice  = parseFloat(inputs.askingPrice.replace(/,/g,""));
    const fairMid   = scores.valuation.fairValueEstimate;
    const fairLow   = scores.valuation.fairValueLow;
    const fairHigh  = scores.valuation.fairValueHigh;
    const gapPct    = ((askPrice - fairMid) / fairMid * 100).toFixed(1);
    const mktLow    = scores.valuation.marketRange[0].toFixed(2);
    const mktHigh   = scores.valuation.marketRange[1].toFixed(2);
    const mktMid    = ((scores.valuation.marketRange[0] + scores.valuation.marketRange[1]) / 2).toFixed(2);
    const location  = [inputs.city, inputs.state].filter(Boolean).join(", ");

    const systemPrompt = `You are a senior M&A advisor producing a comprehensive pre-LOI deal screening memo for a business acquisition. Your output must be a single valid JSON object — no markdown, no backticks, no text before or after. Be analytical, conditional, and institutional. Use ranges and conditional statements. The buyer has provided detailed business profile information — incorporate it into the analysis.`;

    const userPrompt = `Produce a comprehensive deal screening memo for this ${ind?.label} acquisition.

DEAL METRICS:
- Asking: $${askPrice.toLocaleString()} (${scores.valuation.multiple.toFixed(2)}x SDE)
- Fair Value Range: $${fairLow.toLocaleString()}–$${fairHigh.toLocaleString()} (median $${fairMid.toLocaleString()})
- Market Range: ${mktLow}–${mktHigh}x median ${mktMid}x — ${ind?.sampleSize?.toLocaleString()} transactions (${ind?.benchmarkSource})
- Range Position: ${scores.valuation.rangePosition} (${Number(gapPct)>0?"+":""}${gapPct}% vs median)
- SDE Margin: ${sdeMargin}% (industry: ${ind?.marginRange[0]}–${ind?.marginRange[1]}%)
- DSCR: ${scores.debtRisk.dscr.toFixed(2)}x
- Score: ${scores.overall}/100 (${scores.riskLevel} Risk)

BUSINESS PROFILE (use in analysis):
- Industry: ${ind?.label} (${ind?.category}, ${ind?.growth} growth)
- Location: ${location || "Not specified"}
- Years in Business: ${inputs.yearsInBusiness || "Unknown"}
- Employees: ${inputs.employeeCount || "Unknown"}
- Revenue Trend: ${inputs.revenueGrowth}
- Customer Concentration: ${inputs.customerConcentration}
- Owner-Operated: ${inputs.ownerOperated ? "Yes" : "No"}
- Includes Real Estate: ${inputs.hasRealEstate ? "Yes" : "No"}

Return ONLY this JSON (all fields required, no markdown):
{
  "positioning": {
    "marketPosition": "Above Market or Inline with Market or Below Market",
    "buyerFit": "Operator or Strategic or First-Time Buyer or Operator / Strategic",
    "executionDifficulty": "Low or Moderate or High",
    "negotiationLeverage": "Low or Moderate or High"
  },
  "whatMustBeTrue": [
    "Conditional assumption 1 — use if/then language with specific dollar impact",
    "Conditional assumption 2",
    "Conditional assumption 3",
    "Conditional assumption 4"
  ],
  "decisionPath": {
    "steps": ["Step 1 — specific action", "Step 2", "Step 3"],
    "ifValidated": "Specific next action if assumptions hold",
    "ifNot": "Specific recourse if assumptions fail"
  },
  "negotiationPlaybook": {
    "anchorRange": "Opening offer range with brief rationale anchored to transaction data",
    "structureIdeas": ["Structure idea 1 e.g. seller note", "Structure idea 2 e.g. earn-out"],
    "walkAway": "The price or condition beyond which return assumptions cannot be supported"
  },
  "dealBreakers": ["Critical risk 1", "Critical risk 2", "Critical risk 3", "Critical risk 4"],
  "confidenceNote": "One sentence on data support. One sentence on limitations.",
  "pricingContext": "2-3 sentences comparing ask to market multiples with specific percentages. Institutional tone.",
  "businessQuality": "2-3 sentences on margin vs industry, DSCR strength, and one specific business profile risk or strength from the profile data.",
  "buyerInterpretation": "2-3 sentences on what must be true for the deal to work, primary risk concentration, and one priority diligence action tied to the specific business profile."
}`;

    try {
      const res = await fetch("/api/deal-check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, messages: [{ role: "user", content: userPrompt }] }),
      });
      const data = await res.json();
      const raw = data.content?.map((b: { type: string; text?: string }) => (b.type === "text" ? b.text : "")).join("") || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const memo: DealMemo = JSON.parse(jsonMatch[0]);
          setDealMemo(memo);
          setResults((p) => p ? { ...p, dealMemo: memo, aiInsight: [memo.pricingContext, memo.businessQuality, memo.buyerInterpretation].join("\n\n") } : p);
          setMemoLoading(false);
          return;
        } catch { /* fall through to fallback */ }
      }
    } catch { /* fall through to fallback */ }

    // Fallback memo
    buildFallbackMemo(scores, ind, sdeMargin, gapPct, mktLow, mktHigh, mktMid, askPrice, fairLow, fairMid, fairHigh);
    setMemoLoading(false);
  };

  const buildFallbackMemo = (
    scores: FullScoreBreakdown,
    ind: typeof INDUSTRIES[string] | undefined,
    sdeMargin: string, gapPct: string,
    mktLow: string, mktHigh: string, mktMid: string,
    askPrice: number, fairLow: number, fairMid: number, fairHigh: number
  ) => {
    const isAbove  = scores.valuation.rangePosition === "Above Range";
    const isBelow  = scores.valuation.rangePosition === "Below Range";
    const dscrOk   = scores.debtRisk.dscr >= 1.25;
    const marginOk = parseFloat(sdeMargin) >= (ind?.marginRange[0] || 0);
    const gapN     = parseFloat(gapPct);
    const sdeNum   = parseFloat(inputs.sde.replace(/,/g,"")) || 0;

    const memo: DealMemo = {
      positioning: {
        marketPosition: isAbove ? "Above Market" : isBelow ? "Below Market" : "Inline with Market",
        buyerFit: scores.overall >= 65 ? "Operator / Strategic" : scores.overall >= 45 ? "Operator" : "First-Time Buyer",
        executionDifficulty: isAbove || !dscrOk ? "High" : scores.overall >= 65 ? "Low" : "Moderate",
        negotiationLeverage: isAbove ? "High" : isBelow ? "Low" : "Moderate",
      },
      whatMustBeTrue: [
        `Revenue and SDE must remain at or above reported levels — if SDE declines 10%, implied fair value falls to approximately $${Math.round(fairLow * 0.9).toLocaleString()}`,
        `All seller add-backs must be documented and non-recurring — unsupported add-backs would directly reduce effective SDE and compress the justified multiple`,
        `DSCR of ${scores.debtRisk.dscr.toFixed(2)}x must hold under stress — a 15% revenue decline would pressure coverage toward the 1.0x threshold at current debt terms`,
        inputs.customerConcentration === "high"
          ? "Customer concentration must be resolved — binding multi-year contracts or demonstrated diversification required before LOI"
          : "Customer concentration must remain within acceptable limits — any single account above 25% introduces meaningful volatility risk",
      ],
      decisionPath: {
        steps: [
          "Execute NDA and request 3 years of tax returns, P&L statements, and complete owner compensation detail",
          "Validate all reported add-backs with supporting documentation and confirm non-recurring nature",
          inputs.ownerOperated
            ? "Assess owner dependency — confirm whether the business can operate without the current owner and develop a transition plan"
            : "Confirm customer concentration and split between recurring and project-based revenue",
        ],
        ifValidated: `If financials confirm reported SDE and add-backs are documented → proceed to LOI targeting ${fmt(Math.round(fairMid * 0.95))}–${fmt(fairMid)}`,
        ifNot: `If SDE is lower than represented or add-backs are unsupported → renegotiate toward ${fmt(fairLow)}–${fmt(Math.round(fairMid * 0.9))} or restructure with a seller note covering the valuation gap`,
      },
      negotiationPlaybook: {
        anchorRange: `Open at ${fmt(Math.round(fairLow * (gapN > 20 ? 0.95 : 1.0)))}–${fmt(fairMid)}, anchored to ${ind?.sampleSize?.toLocaleString()} comparable closed transactions (${ind?.benchmarkSource})`,
        structureIdeas: [
          gapN > 15
            ? `Seller note covering ${Math.min(30, Math.round(gapN / 2))}% of the gap above median fair value — bridges ask-to-bid difference while limiting buyer's initial cash outlay`
            : "Standard SBA structure with 90-day seller transition and seller note at market rate",
          `Earn-out tied to Year 1 SDE at or above $${Math.round(sdeNum * 0.95).toLocaleString()} — limits downside if performance lags representations`,
        ],
        walkAway: `If seller will not move below ${fmt(Math.round(fairHigh * 1.15))} and financials do not support the represented SDE, return assumptions cannot be supported on standard terms`,
      },
      dealBreakers: [
        "SDE materially lower than represented after owner compensation normalization and add-back review",
        `DSCR falls below 1.0x under a 15% revenue stress scenario at current debt terms`,
        inputs.customerConcentration === "high"
          ? "Customer concentration confirmed above 30% in a single account without binding multi-year contract in place"
          : "Customer concentration above 30% in a single account without a binding multi-year contract",
        inputs.ownerOperated
          ? "Owner performing non-transferable technical or relationship functions with no identified successor or transition plan"
          : "Key employee departure post-acquisition without retention agreements in place",
      ],
      confidenceNote: `Analysis benchmarked against ${ind?.sampleSize?.toLocaleString()} comparable ${ind?.label || ""} transactions (${ind?.benchmarkSource}). Limitations: add-backs, customer concentration, owner dependency, and location-specific factors are not verified at this stage — this is a screening analysis only.`,
      pricingContext: `The ${ind?.label} asking price of ${scores.valuation.multiple.toFixed(2)}x SDE is ${scores.valuation.rangePosition.toLowerCase()} the ${mktLow}–${mktHigh}x range observed across ${ind?.sampleSize?.toLocaleString()} comparable transactions, with the ask ${Math.abs(gapN).toFixed(1)}% ${gapN > 0 ? "above" : "below"} the ${mktMid}x median. ${isAbove ? "The premium requires justification through demonstrable earnings quality, growth trajectory, or strategic value above what comparable transactions reflect." : isBelow ? "Below-range pricing warrants investigation of seller motivation before assuming it represents buyer upside." : "Pricing appears broadly consistent with market norms for this industry."}`,
      businessQuality: `Operating margin of ${sdeMargin}% ${marginOk ? "is within" : "falls below"} the ${ind?.marginRange[0]}–${ind?.marginRange[1]}% industry range${marginOk ? ", supporting the quality of reported earnings" : " — buyers should evaluate cost structure and add-back reliability before accepting reported SDE"}. Projected DSCR of ${scores.debtRisk.dscr.toFixed(2)}x ${dscrOk ? "meets standard lender thresholds, supporting SBA financing eligibility" : "falls below the 1.25x lender minimum and may require additional equity or a revised debt structure"}. ${inputs.revenueGrowth === "declining" ? "Declining revenue is the most material business quality risk and must be explained and quantified before advancing." : inputs.revenueGrowth === "growing" ? "Growing revenue supports the SDE multiple and reduces earnings sustainability risk." : "Flat revenue suggests stability but limits the growth thesis; buyer should evaluate whether organic growth is achievable post-acquisition."}`,
      buyerInterpretation: `For the deal to underwrite at the asking price, reported SDE must be confirmed as normalized and sustainable, and debt coverage must hold under at least a 10–15% revenue stress scenario. ${isAbove ? "The primary risk concentrates in valuation — the ask requires above-median earnings quality to support the implied multiple." : "The primary risk concentrates in operational reliability — buyers should validate revenue predictability and owner dependency before advancing."} ${inputs.ownerOperated ? "Priority diligence: confirm whether the business can operate without the current owner and secure a structured 6–12 month transition agreement before LOI." : "Priority diligence: obtain 3 years of tax returns and normalize owner compensation before submitting an LOI."}`,
    };
    setDealMemo(memo);
    setResults((p) => p ? { ...p, dealMemo: memo, aiInsight: [memo.pricingContext, memo.businessQuality, memo.buyerInterpretation].join("\n\n") } : p);
  };

  const recordDeal = async (scores: FullScoreBreakdown) => {
    try {
      await fetch("/api/record-deal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool_used: "risk_analyzer", industry: inputs.industry,
          revenue: inputs.revenue, sde: inputs.sde, asking_price: inputs.askingPrice,
          debt_percent: parseFloat(inputs.debtPercent), interest_rate: parseFloat(inputs.interestRate), term_years: parseInt(inputs.loanTermYears),
          city: inputs.city || null, state: inputs.state || null, zip_code: inputs.zipCode || null,
          employees: inputs.employeeCount ? parseInt(inputs.employeeCount) : null,
          years_in_business: inputs.yearsInBusiness ? parseInt(inputs.yearsInBusiness) : null,
          revenue_trend: inputs.revenueGrowth || null, customer_concentration: inputs.customerConcentration || null,
          owner_operated: inputs.ownerOperated, has_real_estate: inputs.hasRealEstate,
          valuation_multiple: +scores.valuation.multiple.toFixed(2), dscr: +scores.debtRisk.dscr.toFixed(2),
          monthly_payment: Math.round(scores.debtRisk.monthlyPayment),
          fair_value: scores.valuation.fairValueEstimate,
          fair_value_low: scores.valuation.fairValueLow, fair_value_high: scores.valuation.fairValueHigh,
          range_position: scores.valuation.rangePosition,
          recommended_offer_low: scores.valuation.recommendedOffer[0], recommended_offer_high: scores.valuation.recommendedOffer[1],
          overall_score: scores.overall, risk_level: scores.riskLevel,
          valuation_score: scores.valuation.score, debt_score: scores.debtRisk.score,
          market_score: scores.marketRisk.score, industry_score: scores.industryRisk.score,
          operational_score: scores.operationalRisk.score,
          red_flags: scores.redFlags, green_flags: scores.greenFlags, next_step: scores.nextStep,
        }),
      });
    } catch { /* non-blocking */ }
  };

  const handleReset = () => { setStep(1); setResults(null); setDealMemo(null); };

  const generateDealMemoPDF = async () => {
    if (!results) return;
    setPdfExporting(true);
    const ind = INDUSTRIES[inputs.industry];
    const location = [inputs.city, inputs.state].filter(Boolean).join(", ");
    const pages: HTMLCanvasElement[] = [];
    const S = 2, W = 816 * S, H = 1056 * S, PW = 816, PH = 1056;

    const newPage = () => {
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const ctx = c.getContext("2d")!;
      ctx.scale(S, S);
      ctx.fillStyle = "#0A0E14"; ctx.fillRect(0, 0, PW, PH);
      ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.fillRect(0, 0, PW, 44);
      ctx.fillStyle = "#FFFFFF"; ctx.font = "bold 15px monospace"; ctx.fillText("NEXTAX", 24, 29);
      ctx.fillStyle = "#2DD4BF"; ctx.font = "bold 15px monospace"; ctx.fillText(".AI", 90, 29);
      ctx.fillStyle = "#2DD4BF"; ctx.font = "400 10px monospace";
      ctx.textAlign = "right"; ctx.fillText("DEAL RISK ANALYZER", PW - 24, 29); ctx.textAlign = "left";
      ctx.fillStyle = "#6366F1"; ctx.fillRect(0, 0, 3, PH);
      pages.push(c);
      return ctx;
    };

    const drawBar = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, score: number, label: string, explanation: string) => {
      const col = score >= 70 ? "#10B981" : score >= 50 ? "#F59E0B" : score >= 30 ? "#F97316" : "#EF4444";
      ctx.fillStyle = "#6B7280"; ctx.font = "400 11px sans-serif"; ctx.fillText(label, x, y);
      ctx.fillStyle = col; ctx.font = "bold 12px monospace"; ctx.textAlign = "right"; ctx.fillText(String(score), x + w, y); ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.beginPath(); (ctx as any).roundRect(x, y + 6, w, 5, 3); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); (ctx as any).roundRect(x, y + 6, w * (score / 100), 5, 3); ctx.fill();
      ctx.fillStyle = "#4B5563"; ctx.font = "400 10px sans-serif"; ctx.fillText("→ " + explanation.substring(0, 80), x, y + 20);
    };

    let ctx = newPage();
    let y = 80;

    ctx.fillStyle = "#F59E0B"; ctx.font = "bold 11px monospace"; ctx.fillText("DEAL RISK ANALYZER — FULL UNDERWRITING MEMO", 40, y); y += 28;
    ctx.fillStyle = "#E2E8F0"; ctx.font = "bold 24px sans-serif"; ctx.fillText(`${location ? location + " " : ""}${ind?.label || ""}`, 40, y); y += 18;
    ctx.fillStyle = "#6B7280"; ctx.font = "400 12px sans-serif";
    ctx.fillText(`Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} | Score: ${results.overall}/100 (${results.riskLevel} Risk)`, 40, y); y += 36;

    // Score circle
    const scx = 110, scy = y + 55, sr = 46;
    ctx.beginPath(); ctx.arc(scx, scy, sr, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 8; ctx.stroke();
    const scCol = results.overall >= 70 ? "#10B981" : results.overall >= 50 ? "#F59E0B" : results.overall >= 30 ? "#F97316" : "#EF4444";
    ctx.beginPath(); ctx.arc(scx, scy, sr, -Math.PI / 2, -Math.PI / 2 + (results.overall / 100) * Math.PI * 2);
    ctx.strokeStyle = scCol; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.stroke();
    ctx.fillStyle = scCol; ctx.font = "bold 32px monospace"; ctx.textAlign = "center"; ctx.fillText(String(results.overall), scx, scy + 10);
    ctx.fillStyle = "#6B7280"; ctx.font = "400 8px sans-serif"; ctx.fillText("DEAL SCORE", scx, scy + 26); ctx.textAlign = "left";

    const mx = 200;
    const metrics = [
      ["Industry", ind?.label || ""], ["Revenue", fmt(parseFloat(inputs.revenue.replace(/,/g, "")))],
      ["SDE", fmt(parseFloat(inputs.sde.replace(/,/g, "")))], ["Asking Price", fmt(parseFloat(inputs.askingPrice.replace(/,/g, "")))],
      ["Multiple", results.valuation.multiple.toFixed(2) + "x SDE"], ["DSCR", results.debtRisk.dscr.toFixed(2)],
      ["Fair Value Range", `${fmt(results.valuation.fairValueLow)}–${fmt(results.valuation.fairValueHigh)}`],
      ["Smart Offer Range", `${fmt(results.valuation.recommendedOffer[0])}–${fmt(results.valuation.recommendedOffer[1])}`],
    ];
    metrics.forEach((m, i) => {
      const my = y + 12 + i * 20;
      ctx.fillStyle = "#6B7280"; ctx.font = "400 10px sans-serif"; ctx.fillText(m[0], mx, my);
      ctx.fillStyle = "#E2E8F0"; ctx.font = "500 11px monospace"; ctx.fillText(m[1], mx + 160, my);
    });
    y += 185;

    ctx.fillStyle = "#818CF8"; ctx.font = "bold 11px monospace"; ctx.fillText("RISK SCORES (WITH DRIVERS)", 40, y); y += 20;
    const bars = [
      { label: "Valuation Risk", score: results.valuation.score, exp: results.valuation.scoreExplanation },
      { label: "Debt Risk",      score: results.debtRisk.score,  exp: results.debtRisk.scoreExplanation  },
      { label: "Market Risk",    score: results.marketRisk.score, exp: results.marketRisk.scoreExplanation },
      { label: "Industry Risk",  score: results.industryRisk.score, exp: results.industryRisk.scoreExplanation },
      { label: "Operational",   score: results.operationalRisk.score, exp: results.operationalRisk.scoreExplanation },
    ];
    bars.forEach((b) => { drawBar(ctx, 60, y, 500, b.score, b.label, b.exp); y += 38; });
    y += 10;

    // Red/green flags
    if (results.redFlags.length > 0) {
      ctx.fillStyle = "#EF4444"; ctx.font = "bold 10px monospace"; ctx.fillText("DILIGENCE CONSIDERATIONS", 60, y); y += 14;
      results.redFlags.forEach((f) => { ctx.fillStyle = "#FCA5A5"; ctx.font = "400 10px sans-serif"; ctx.fillText("▸ " + f.substring(0, 95), 70, y); y += 14; });
      y += 4;
    }
    if (results.greenFlags.length > 0) {
      ctx.fillStyle = "#10B981"; ctx.font = "bold 10px monospace"; ctx.fillText("SUPPORTING INDICATORS", 60, y); y += 14;
      results.greenFlags.forEach((f) => { ctx.fillStyle = "#6EE7B7"; ctx.font = "400 10px sans-serif"; ctx.fillText("▸ " + f.substring(0, 95), 70, y); y += 14; });
    }

    // Page 2: Stress tests + AI memo
    if (pdfOptions.stressTest || (pdfOptions.aiAssessment && dealMemo)) {
      ctx = newPage(); y = 70;

      if (pdfOptions.stressTest) {
        ctx.fillStyle = "#818CF8"; ctx.font = "bold 11px monospace"; ctx.fillText("STRESS TEST SCENARIOS", 40, y); y += 18;
        ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.beginPath(); (ctx as any).roundRect(40, y, PW - 80, results.stressTests.length * 38 + 16, 8); ctx.fill();
        const cols = [60, 200, 310, 420, 560, 660];
        ["Scenario","New Revenue","New SDE","DSCR","Fair Value","Status"].forEach((h, i) => {
          ctx.fillStyle = "#6B7280"; ctx.font = "500 9px monospace"; ctx.fillText(h, cols[i], y + 14);
        });
        results.stressTests.forEach((s, i) => {
          const ry = y + 28 + i * 38;
          const dscrCol = s.dscrPass ? "#10B981" : "#EF4444";
          ctx.fillStyle = "#E2E8F0"; ctx.font = "500 10px sans-serif"; ctx.fillText(s.label, cols[0], ry);
          ctx.fillStyle = "#94A3B8"; ctx.font = "400 10px monospace"; ctx.fillText(fmt(s.newRevenue), cols[1], ry);
          ctx.fillStyle = "#94A3B8"; ctx.font = "400 10px monospace"; ctx.fillText(fmt(s.newSde), cols[2], ry);
          ctx.fillStyle = dscrCol; ctx.font = "bold 10px monospace"; ctx.fillText(s.newDscr.toFixed(2) + "x", cols[3], ry);
          ctx.fillStyle = "#94A3B8"; ctx.font = "400 10px monospace"; ctx.fillText(fmt(s.newFairValue), cols[4], ry);
          ctx.fillStyle = dscrCol; ctx.font = "500 9px sans-serif"; ctx.fillText(s.dscrPass ? "PASS" : "STRESS", cols[5], ry);
          ctx.fillStyle = "#4B5563"; ctx.font = "400 9px sans-serif"; ctx.fillText(s.verdict, cols[0], ry + 14);
        });
        y += results.stressTests.length * 38 + 30;
      }

      if (pdfOptions.aiAssessment && dealMemo) {
        const sections = [
          { label: "PRICING CONTEXT",      text: dealMemo.pricingContext },
          { label: "BUSINESS QUALITY",     text: dealMemo.businessQuality },
          { label: "BUYER INTERPRETATION", text: dealMemo.buyerInterpretation },
        ];
        sections.forEach((s) => {
          ctx.fillStyle = "#818CF8"; ctx.font = "bold 10px monospace"; ctx.fillText(s.label, 40, y); y += 14;
          ctx.fillStyle = "#C4B5FD"; ctx.font = "400 11px sans-serif";
          const words = s.text.replace(/\*\*/g, "").split(" ");
          let line = "";
          words.forEach((word) => {
            const test = line + word + " ";
            if (ctx.measureText(test).width > PW - 100 && line) { ctx.fillText(line.trim(), 60, y); line = word + " "; y += 15; }
            else { line = test; }
          });
          if (line.trim()) { ctx.fillText(line.trim(), 60, y); y += 15; }
          y += 10;
          if (y > PH - 100) { ctx = newPage(); y = 70; }
        });

        // What Must Be True
        ctx.fillStyle = "#F59E0B"; ctx.font = "bold 10px monospace"; ctx.fillText("WHAT MUST BE TRUE", 40, y); y += 14;
        dealMemo.whatMustBeTrue.forEach((a, i) => {
          ctx.fillStyle = "#FBBF24"; ctx.font = "400 10px sans-serif";
          ctx.fillText(`${i+1}. ${a.substring(0, 95)}`, 60, y); y += 14;
          if (a.length > 95) { ctx.fillText(`   ${a.substring(95, 180)}`, 60, y); y += 14; }
        });
        y += 8;

        // Deal Breakers
        ctx.fillStyle = "#EF4444"; ctx.font = "bold 10px monospace"; ctx.fillText("DEAL BREAKERS", 40, y); y += 14;
        dealMemo.dealBreakers.forEach((d) => {
          ctx.fillStyle = "#FCA5A5"; ctx.font = "400 10px sans-serif";
          ctx.fillText("✕ " + d.substring(0, 90), 60, y); y += 14;
        });
      }

      // Footer p2
      ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.fillRect(0, PH - 50, PW, 50);
      ctx.fillStyle = "#374151"; ctx.font = "400 10px sans-serif";
      ctx.fillText("Generated by NexTax Deal Intelligence Platform — nextax.ai", 40, PH - 28);
      ctx.textAlign = "right"; ctx.fillText(new Date().toLocaleDateString(), PW - 40, PH - 28); ctx.textAlign = "left";
      ctx.fillStyle = "#374151"; ctx.font = "400 9px sans-serif";
      ctx.fillText("This report is for informational purposes only and does not constitute financial advice.", 40, PH - 14);
    }

    // Footer p1
    const p1ctx = pages[0].getContext("2d")!;
    p1ctx.fillStyle = "rgba(255,255,255,0.03)"; p1ctx.fillRect(0, PH - 50, PW, 50);
    p1ctx.fillStyle = "#374151"; p1ctx.font = "400 10px sans-serif";
    p1ctx.fillText("Generated by NexTax Deal Intelligence Platform — nextax.ai", 40, PH - 28);
    p1ctx.textAlign = "right"; p1ctx.fillText(new Date().toLocaleDateString(), PW - 40, PH - 28); p1ctx.textAlign = "left";
    p1ctx.fillStyle = "#374151"; p1ctx.font = "400 9px sans-serif";
    p1ctx.fillText("This report is for informational purposes only and does not constitute financial advice.", 40, PH - 14);

    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [PW, PH] });
    pages.forEach((pageCanvas, i) => {
      if (i > 0) pdf.addPage([PW, PH]);
      pdf.addImage(pageCanvas.toDataURL("image/png", 1.0), "PNG", 0, 0, PW, PH);
    });
    pdf.save(`NexTax-Risk-Memo-${ind?.label?.replace(/\s/g,"-") || "Deal"}-${new Date().toISOString().split("T")[0]}.pdf`);
    setPdfExporting(false);
    setShowPdfOptions(false);
  };

  const ind = INDUSTRIES[inputs.industry];

  return (
    <div className="min-h-screen" style={{ background: "#0B0F17", color: "#E2E8F0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=JetBrains+Mono:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
        *{box-sizing:border-box}select,input{font-family:'DM Sans',sans-serif}select:focus,input:focus{border-color:rgba(99,102,241,0.5)!important;outline:none}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .4s ease-out forwards}
        .fd1{animation-delay:.08s;opacity:0}.fd2{animation-delay:.16s;opacity:0}.fd3{animation-delay:.24s;opacity:0}
        .fd4{animation-delay:.32s;opacity:0}.fd5{animation-delay:.4s;opacity:0}.fd6{animation-delay:.48s;opacity:0}
        @keyframes pulseGlow{0%,100%{box-shadow:0 0 20px rgba(99,102,241,0.1)}50%{box-shadow:0 0 40px rgba(99,102,241,0.25)}}
      `}</style>

      {/* Header */}
      <div style={{ padding: "40px 24px 32px", textAlign: "center", background: "radial-gradient(ellipse at center top, rgba(59,130,246,0.06) 0%, transparent 60%)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 20, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", fontSize: 12, color: "#60A5FA", fontWeight: 600, marginBottom: 16 }}>
          🔎 Full Acquisition Underwriting
        </div>
        <h1 style={{ fontSize: "clamp(26px, 4.5vw, 40px)", fontWeight: 800, margin: "0 0 10px", fontFamily: "'Instrument Serif', serif", background: "linear-gradient(135deg, #F8FAFC 0%, #94A3B8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.15 }}>
          Deal Risk Analyzer
        </h1>
        <p style={{ fontSize: 15, color: "#8896A6", maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
          Full decision-grade underwriting with stress tests, negotiation playbook, and institutional-quality deal memo. Enter your deal details to get a buy-side assessment.
        </p>
      </div>

      {/* EMAIL GATE */}
      {gated && (
        <div style={{ maxWidth: 440, margin: "0 auto", padding: "0 24px 40px" }}>
          <div className="fu" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "32px 28px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔎</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px", color: "#E2E8F0", fontFamily: "'Instrument Serif', serif" }}>Get your full underwriting report.</h2>
            <p style={{ fontSize: 14, color: "#8896A6", margin: "0 0 24px", lineHeight: 1.5 }}>Enter your email to access the Deal Risk Analyzer with AI underwriting, stress tests, and negotiation memo.</p>
            <div style={{ textAlign: "left", marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>First Name</label>
              <input type="text" placeholder="Steve" value={gateName} onChange={(e) => setGateName(e.target.value)} style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14 }} />
            </div>
            <div style={{ textAlign: "left", marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</label>
              <input type="email" placeholder="you@email.com" value={gateEmail} onChange={(e) => setGateEmail(e.target.value)} style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14 }} />
            </div>
            <button onClick={handleGateSubmit} disabled={!gateEmail || gateLoading} style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: gateEmail ? "linear-gradient(135deg, #3B82F6, #6366F1)" : "rgba(255,255,255,0.08)", color: gateEmail ? "#fff" : "#6B7280", fontSize: 15, fontWeight: 700, cursor: gateEmail ? "pointer" : "not-allowed" }}>
              {gateLoading ? "Loading..." : "🔎 Start Analysis"}
            </button>
            <p style={{ fontSize: 11, color: "#4B5563", marginTop: 12 }}>No spam. Unsubscribe anytime.</p>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 60px", display: gated ? "none" : "block" }}>

        {/* Step Indicator */}
        {step < 4 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 28 }}>
            {[1,2,3].map((s) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", background: step >= s ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)", border: step >= s ? "1.5px solid rgba(99,102,241,0.4)" : "1.5px solid rgba(255,255,255,0.08)", color: step >= s ? "#818CF8" : "#4B5563" }}>{s}</div>
                {s < 3 && <div style={{ width: 32, height: 1.5, background: step > s ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)" }} />}
              </div>
            ))}
          </div>
        )}

        {/* STEP 1: Financials */}
        {step === 1 && (
          <div className="fu" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "24px 24px 16px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px", color: "#E2E8F0" }}>Deal Financials</h2>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px" }}>Core numbers from the CIM or listing.</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Industry</label>
              <select value={inputs.industry} onChange={(e) => set("industry", e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14 }}>
                <option value="">Select industry...</option>
                {Object.entries(INDUSTRIES).sort((a,b) => a[1].label.localeCompare(b[1].label)).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <InputField label="Annual Revenue" value={inputs.revenue} onChange={(v) => setCurrency("revenue", v)} placeholder="500,000" prefix="$" />
              <InputField label="SDE / Cash Flow" value={inputs.sde} onChange={(v) => setCurrency("sde", v)} placeholder="150,000" prefix="$" />
            </div>
            <InputField label="Asking Price" value={inputs.askingPrice} onChange={(v) => setCurrency("askingPrice", v)} placeholder="450,000" prefix="$" />
            <div style={{ padding: "14px 18px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 500 }}>Debt Terms</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <InputField label="Debt %" value={inputs.debtPercent} onChange={(v) => set("debtPercent", v.replace(/[^0-9.]/g,""))} small suffix="%" />
                <InputField label="Rate %" value={inputs.interestRate} onChange={(v) => set("interestRate", v.replace(/[^0-9.]/g,""))} small suffix="%" />
                <InputField label="Term" value={inputs.loanTermYears} onChange={(v) => set("loanTermYears", v.replace(/[^0-9]/g,""))} small suffix="yr" />
              </div>
            </div>
            <button onClick={() => setStep(2)} disabled={!canProceedStep1} style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: canProceedStep1 ? "linear-gradient(135deg,#6366F1,#8B5CF6)" : "rgba(255,255,255,0.08)", color: canProceedStep1 ? "#fff" : "#6B7280", fontSize: 15, fontWeight: 700, cursor: canProceedStep1 ? "pointer" : "not-allowed" }}>
              Next: Location →
            </button>
          </div>
        )}

        {/* STEP 2: Location */}
        {step === 2 && (
          <div className="fu" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "24px 24px 16px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px", color: "#E2E8F0" }}>Location</h2>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px" }}>Optional — improves market risk scoring.</p>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
              <InputField label="City" value={inputs.city} onChange={(v) => set("city", v)} placeholder="Austin" />
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>State</label>
                <select value={inputs.state} onChange={(e) => set("state", e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14 }}>
                  <option value="">Select...</option>
                  {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <InputField label="Zip Code" value={inputs.zipCode} onChange={(v) => set("zipCode", v.replace(/[^0-9]/g,"").slice(0,5))} placeholder="78701" />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: "13px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#8896A6", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>← Back</button>
              <button onClick={() => setStep(3)} style={{ flex: 2, padding: "13px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Next: Business Profile →</button>
            </div>
          </div>
        )}

        {/* STEP 3: Business Profile */}
        {step === 3 && (
          <div className="fu" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "24px 24px 16px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px", color: "#E2E8F0" }}>Business Profile</h2>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px" }}>Operational details power the AI underwriting memo and stress tests.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <InputField label="Years in Business" value={inputs.yearsInBusiness} onChange={(v) => set("yearsInBusiness", v.replace(/[^0-9]/g,""))} placeholder="8" />
              <InputField label="# of Employees" value={inputs.employeeCount} onChange={(v) => set("employeeCount", v.replace(/[^0-9]/g,""))} placeholder="12" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Revenue Trend</label>
                <select value={inputs.revenueGrowth} onChange={(e) => set("revenueGrowth", e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14 }}>
                  <option value="growing">Growing</option>
                  <option value="flat">Flat</option>
                  <option value="declining">Declining</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Customer Concentration</label>
                <select value={inputs.customerConcentration} onChange={(e) => set("customerConcentration", e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14 }}>
                  <option value="low">Low (diversified)</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High (top client &gt; 30%)</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#C9D1D9" }}>
                <input type="checkbox" checked={inputs.ownerOperated} onChange={(e) => set("ownerOperated", e.target.checked)} style={{ width: 16, height: 16, accentColor: "#6366F1" }} />
                Owner-operated
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#C9D1D9" }}>
                <input type="checkbox" checked={inputs.hasRealEstate} onChange={(e) => set("hasRealEstate", e.target.checked)} style={{ width: 16, height: 16, accentColor: "#6366F1" }} />
                Includes real estate
              </label>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: "13px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#8896A6", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>← Back</button>
              <button onClick={handleSubmit} disabled={loading} style={{ flex: 2, padding: "13px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Analyzing Deal..." : "⚡ Run Full Analysis"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: RESULTS */}
        {step === 4 && results && (
          <div ref={resultsRef}>

            {/* ── Score Hero ── */}
            <div className="fu" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "28px 24px", marginBottom: 14, textAlign: "center", animation: "pulseGlow 3s ease-in-out infinite" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><ScoreRing score={results.overall} size={150} sw={9} /></div>
              <div style={{ display: "inline-block", padding: "5px 18px", borderRadius: 20, background: getRiskBg(results.riskLevel), fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 14 }}>{results.riskLevel} Risk</div>
              <div style={{ fontSize: 10, color: "#4B5563", marginBottom: 12, fontStyle: "italic" }}>
                Benchmarked against {ind?.sampleSize?.toLocaleString()} comparable {ind?.label} transactions — {ind?.benchmarkSource}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
                {[
                  { l: "Multiple", v: results.valuation.multiple.toFixed(2) + "x" },
                  { l: "DSCR", v: results.debtRisk.dscr.toFixed(2) },
                  { l: "Monthly Debt", v: fmt(results.debtRisk.monthlyPayment) },
                  { l: "Fair Value Mid", v: fmt(results.valuation.fairValueEstimate) },
                ].map((m) => (
                  <div key={m.l} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>{m.v}</div>
                    <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase" }}>{m.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Implied Fair Value Range ── */}
            <div className="fu fd1" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 14, padding: "18px 22px", marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#818CF8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14, fontWeight: 600 }}>💰 Implied Fair Value Range</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                {[
                  { label: "LOW END",      val: results.valuation.fairValueLow,      sub: `${results.valuation.marketRange[0].toFixed(2)}x SDE`, color: "#10B981" },
                  { label: "MEDIAN (MID)", val: results.valuation.fairValueEstimate,  sub: `${((results.valuation.marketRange[0]+results.valuation.marketRange[1])/2).toFixed(2)}x SDE`, color: "#818CF8" },
                  { label: "HIGH END",     val: results.valuation.fairValueHigh,      sub: `${results.valuation.marketRange[1].toFixed(2)}x SDE`, color: "#F59E0B" },
                ].map(({ label, val, sub, color }) => (
                  <div key={label} style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(val)}</div>
                    <div style={{ fontSize: 10, color: "#4B5563", marginTop: 2 }}>{sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: results.valuation.rangePosition === "Above Range" ? "rgba(239,68,68,0.12)" : results.valuation.rangePosition === "Below Range" ? "rgba(16,185,129,0.12)" : "rgba(59,130,246,0.12)",
                  color: results.valuation.rangePosition === "Above Range" ? "#EF4444" : results.valuation.rangePosition === "Below Range" ? "#10B981" : "#3B82F6",
                  border: `1px solid ${results.valuation.rangePosition === "Above Range" ? "rgba(239,68,68,0.25)" : results.valuation.rangePosition === "Below Range" ? "rgba(16,185,129,0.25)" : "rgba(59,130,246,0.25)"}` }}>
                  {results.valuation.rangePosition}
                </div>
                <div style={{ fontSize: 11, color: "#4B5563" }}>Asking: {fmt(parseFloat(inputs.askingPrice.replace(/,/g,"")))} — {results.valuation.multiple.toFixed(2)}x SDE</div>
              </div>
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5, fontWeight: 600 }}>Negotiation Guidance</div>
                {(() => {
                  const askPrice = parseFloat(inputs.askingPrice.replace(/,/g,""));
                  const gapPct   = ((askPrice - results.valuation.fairValueEstimate) / results.valuation.fairValueEstimate * 100);
                  const absPct   = Math.abs(gapPct).toFixed(1);
                  let guidance = "", anchorNote = "", walkNote = "";
                  if (gapPct > 30) {
                    guidance   = `Ask is ${absPct}% above the observed median. Anchor at the low-end fair value and justify counter with ${ind?.sampleSize?.toLocaleString()} closed transaction comps.`;
                    anchorNote = `Anchor: ${fmt(results.valuation.fairValueLow)} (low-end range)`;
                    walkNote   = `Walk-away: above ${fmt(Math.round(results.valuation.fairValueEstimate * 1.1))}`;
                  } else if (gapPct > 10) {
                    guidance   = `Ask is ${absPct}% above the observed median. Counter near midpoint and propose earn-out or seller note to bridge the gap.`;
                    anchorNote = `Anchor: ${fmt(Math.round(results.valuation.fairValueEstimate * 0.92))}`;
                    walkNote   = `Walk-away: above ${fmt(results.valuation.fairValueHigh)}`;
                  } else if (gapPct >= -10) {
                    guidance   = `Ask is within ${absPct}% of the median. Pricing is consistent with comps — negotiate terms and structure rather than leading on price.`;
                    anchorNote = `Anchor: ${fmt(results.valuation.fairValueEstimate)} (median)`;
                    walkNote   = `Walk-away: above ${fmt(Math.round(results.valuation.fairValueHigh * 1.08))}`;
                  } else {
                    guidance   = `Ask is ${absPct}% below the observed median. Understand seller motivation before proceeding — favorable pricing may reflect undisclosed risk.`;
                    anchorNote = `Anchor: ${fmt(askPrice)} (at ask)`;
                    walkNote   = `Market comps support up to: ${fmt(results.valuation.fairValueEstimate)}`;
                  }
                  return (
                    <>
                      <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.6, marginBottom: 8 }}>{guidance}</div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: "#10B981", fontWeight: 600 }}>📌 {anchorNote}</span>
                        <span style={{ fontSize: 11, color: "#F97316", fontWeight: 600 }}>⚠ {walkNote}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Smart Offer Range</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#10B981", fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmt(results.valuation.recommendedOffer[0])} – {fmt(results.valuation.recommendedOffer[1])}
                </span>
              </div>
            </div>

            {/* ── Risk Scores with Explanations ── */}
            <div className="fu fd2" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "18px 22px", marginBottom: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", margin: "0 0 12px" }}>Risk Scores</h3>
              <SBarExplained label="Valuation"       score={results.valuation.score}       icon="⚖️" explanation={results.valuation.scoreExplanation} />
              <SBarExplained label="Debt Risk"       score={results.debtRisk.score}        icon="🏦" explanation={results.debtRisk.scoreExplanation} />
              <SBarExplained label="Market Risk"     score={results.marketRisk.score}      icon="📈" explanation={results.marketRisk.scoreExplanation} />
              <SBarExplained label="Industry Risk"   score={results.industryRisk.score}    icon="🏭" explanation={results.industryRisk.scoreExplanation} />
              <SBarExplained label="Operational Risk" score={results.operationalRisk.score} icon="⚙️" explanation={results.operationalRisk.scoreExplanation} />
            </div>

            {/* ── Red / Green Flags ── */}
            {(results.redFlags.length > 0 || results.greenFlags.length > 0) && (
              <div className="fu fd3" style={{ display: "grid", gridTemplateColumns: results.redFlags.length > 0 && results.greenFlags.length > 0 ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 14 }}>
                {results.redFlags.length > 0 && (
                  <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)", borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Diligence Considerations</div>
                    {results.redFlags.map((f, i) => (
                      <div key={i} style={{ fontSize: 12, color: "#FCA5A5", lineHeight: 1.5, marginBottom: 6, paddingLeft: 10, borderLeft: "2px solid rgba(239,68,68,0.25)" }}>{f}</div>
                    ))}
                  </div>
                )}
                {results.greenFlags.length > 0 && (
                  <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.1)", borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Supporting Indicators</div>
                    {results.greenFlags.map((f, i) => (
                      <div key={i} style={{ fontSize: 12, color: "#6EE7B7", lineHeight: 1.5, marginBottom: 6, paddingLeft: 10, borderLeft: "2px solid rgba(16,185,129,0.25)" }}>{f}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Stress Tests ── */}
            <div className="fu fd3" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "18px 22px", marginBottom: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", margin: "0 0 4px" }}>📉 Stress Test Scenarios</h3>
              <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 14px" }}>Impact on DSCR and fair value under adverse conditions</p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Scenario","Revenue","SDE","DSCR","Fair Value","Status"].map((h) => (
                        <th key={h} style={{ padding: "8px 10px", fontSize: 10, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.stressTests.map((s, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "10px 10px" }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>{s.label}</div>
                          <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>{s.verdict}</div>
                        </td>
                        <td style={{ padding: "10px 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(s.newRevenue)}</td>
                        <td style={{ padding: "10px 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(s.newSde)}</td>
                        <td style={{ padding: "10px 10px" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: s.dscrPass ? "#10B981" : s.newDscr >= 1.0 ? "#F59E0B" : "#EF4444", fontFamily: "'JetBrains Mono', monospace" }}>
                            {s.newDscr.toFixed(2)}x
                          </span>
                        </td>
                        <td style={{ padding: "10px 10px", fontSize: 12, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(s.newFairValue)}</td>
                        <td style={{ padding: "10px 10px" }}>
                          <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: s.dscrPass ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: s.dscrPass ? "#10B981" : "#EF4444" }}>
                            {s.dscrPass ? "PASS" : "STRESS"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: "#4B5563", fontStyle: "italic" }}>
                DSCR Pass = above 1.25x SBA minimum. Stress = below lender threshold — may require renegotiation or additional equity.
              </div>
            </div>

            {/* ── Industry Benchmarks ── */}
            <div className="fu fd3" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "18px 22px", marginBottom: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", margin: "0 0 14px" }}>📊 Industry Benchmarks</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  { label: "SDE Margin",   yours: results.benchmarks.actualMargin + "%", benchmark: results.benchmarks.typicalMargin[0] + "–" + results.benchmarks.typicalMargin[1] + "%", good: results.benchmarks.actualMargin >= results.benchmarks.typicalMargin[0] },
                  { label: "Multiple",     yours: results.valuation.multiple.toFixed(2) + "x", benchmark: results.benchmarks.typicalMultiple[0] + "–" + results.benchmarks.typicalMultiple[1] + "x", good: results.valuation.multiple <= results.benchmarks.typicalMultiple[1] },
                  { label: "Rev/Employee", yours: fmt(results.benchmarks.revenuePerEmployee), benchmark: fmt(results.benchmarks.industryAvgRevenuePerEmployee), good: results.benchmarks.revenuePerEmployee >= results.benchmarks.industryAvgRevenuePerEmployee * 0.8 },
                ].map((b) => (
                  <div key={b.label} style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", marginBottom: 6 }}>{b.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: b.good ? "#10B981" : "#F59E0B", fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>{b.yours}</div>
                    <div style={{ fontSize: 10, color: "#6B7280" }}>Industry: {b.benchmark}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: "#6B7280" }}>Typical labor ratio: {results.benchmarks.laborRatio}</div>
            </div>

            {/* ── Deal Memo Sections ── */}
            {memoLoading ? (
              <div className="fu fd4" style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.12)", borderRadius: 14, padding: "24px 22px", marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "#818CF8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 600 }}>Deal Underwriting Memo</div>
                <div style={{ fontSize: 13, color: "#A5B4FC", fontStyle: "italic" }}>Composing decision-grade underwriting memo...</div>
              </div>
            ) : dealMemo ? (
              <>
                {/* Deal Positioning */}
                <div className="fu fd4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 22px", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14, fontWeight: 600 }}>Deal Positioning</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      { label: "Market Position", value: dealMemo.positioning.marketPosition, color: dealMemo.positioning.marketPosition === "Above Market" ? "#F59E0B" : dealMemo.positioning.marketPosition === "Below Market" ? "#10B981" : "#3B82F6" },
                      { label: "Buyer Fit", value: dealMemo.positioning.buyerFit, color: "#C4B5FD" },
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

                {/* Deal Assessment */}
                <div className="fu fd4" style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.14)", borderRadius: 14, padding: "18px 22px", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#818CF8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14, fontWeight: 600 }}>Deal Assessment</div>
                  {[
                    { label: "Pricing Context",      text: dealMemo.pricingContext },
                    { label: "Business Quality",     text: dealMemo.businessQuality },
                    { label: "Buyer Interpretation", text: dealMemo.buyerInterpretation },
                  ].map(({ label, text }, i) => (
                    <div key={label} style={{ marginBottom: i < 2 ? 14 : 0, paddingBottom: i < 2 ? 14 : 0, borderBottom: i < 2 ? "1px solid rgba(99,102,241,0.1)" : "none" }}>
                      <div style={{ fontSize: 10, color: "#6366F1", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>{label}</div>
                      <p style={{ margin: 0, fontSize: 13, color: "#C4B5FD", lineHeight: 1.7 }}>{text}</p>
                    </div>
                  ))}
                </div>

                {/* What Must Be True */}
                <div className="fu fd4" style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 14, padding: "18px 22px", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#F59E0B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>What Must Be True</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {dealMemo.whatMustBeTrue.map((a, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ fontSize: 11, color: "#F59E0B", fontWeight: 700, flexShrink: 0, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{i+1}</span>
                        <span style={{ fontSize: 12, color: "#FBBF24", lineHeight: 1.6 }}>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Buyer Decision Path */}
                <div className="fu fd5" style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 14, padding: "18px 22px", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#3B82F6", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontWeight: 600 }}>Buyer Decision Path</div>
                  <div style={{ marginBottom: 12 }}>
                    {dealMemo.decisionPath.steps.map((step, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 7 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 10, background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#3B82F6", flexShrink: 0 }}>{i+1}</div>
                        <span style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5, paddingTop: 2 }}>{step}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { prefix: "If validated →", text: dealMemo.decisionPath.ifValidated, color: "#10B981", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.2)" },
                      { prefix: "If not →",       text: dealMemo.decisionPath.ifNot,       color: "#F97316", bg: "rgba(249,115,22,0.06)",  border: "rgba(249,115,22,0.2)" },
                    ].map(({ prefix, text, color, bg, border }) => (
                      <div key={prefix} style={{ padding: "10px 14px", borderRadius: 8, background: bg, border: `1px solid ${border}` }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color, marginRight: 6 }}>{prefix}</span>
                        <span style={{ fontSize: 12, color: "#94A3B8" }}>{text.replace(/^if (validated|not)[^→]*→\s*/i,"")}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Negotiation Playbook */}
                <div className="fu fd5" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 14, padding: "18px 22px", marginBottom: 12 }}>
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

                {/* Deal Breakers */}
                <div className="fu fd5" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.14)", borderRadius: 14, padding: "18px 22px", marginBottom: 12 }}>
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

                {/* Recommended Next Step */}
                {(() => {
                  const cfg = {
                    advance:  { color: "#10B981", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.2)",  label: "Advance to Diligence",     summary: "Deal metrics are broadly supportive. Valuation, coverage, and industry profile are consistent with a viable acquisition at or near current terms." },
                    validate: { color: "#F59E0B", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.2)",  label: "Validate Key Assumptions", summary: "One or more metrics require clarification. The deal may work — key assumptions must be confirmed before LOI submission." },
                    reprice:  { color: "#F97316", bg: "rgba(249,115,22,0.06)", border: "rgba(249,115,22,0.2)",  label: "Reprice or Reassess",      summary: "At the current ask, return assumptions are difficult to underwrite on standard terms. A structured counter or repricing discussion is warranted." },
                  }[results.nextStep];
                  return (
                    <div className="fu fd5" style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 14, padding: "18px 22px", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 4, background: cfg.color, flexShrink: 0 }} />
                        <div style={{ fontSize: 11, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>Recommended Next Step — {cfg.label}</div>
                      </div>
                      <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6, margin: 0 }}>{cfg.summary}</p>
                    </div>
                  );
                })()}

                {/* Confidence Note */}
                <div className="fu fd5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 18px", marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5, fontWeight: 600 }}>Confidence & Limitations</div>
                  <p style={{ margin: 0, fontSize: 12, color: "#6B7280", lineHeight: 1.6 }}>{dealMemo.confidenceNote}</p>
                </div>
              </>
            ) : null}

            {/* ── Three-Lens Data Sources ── */}
            {results.threeLens && (
              <div className="fu fd5" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(99,102,241,0.06) 100%)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 14, padding: "20px 22px", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ padding: "3px 10px", borderRadius: 6, background: results.threeLens.confidence.overall === "HIGH" ? "rgba(16,185,129,0.15)" : results.threeLens.confidence.overall === "MEDIUM" ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)", border: `1px solid ${results.threeLens.confidence.overall === "HIGH" ? "rgba(16,185,129,0.25)" : results.threeLens.confidence.overall === "MEDIUM" ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.25)"}`, fontSize: 11, fontWeight: 700, color: results.threeLens.confidence.overall === "HIGH" ? "#10B981" : results.threeLens.confidence.overall === "MEDIUM" ? "#F59E0B" : "#EF4444" }}>
                    CONFIDENCE: {results.threeLens.confidence.overall}
                  </div>
                  <span style={{ fontSize: 12, color: "#8896A6" }}>Three-lens market intelligence</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                  {[
                    { icon: "📊", label: "Listings",     ...results.threeLens.confidence.listing },
                    { icon: "💰", label: "Transactions", ...results.threeLens.confidence.transaction },
                    { icon: "🏦", label: "Financial",    ...results.threeLens.confidence.financial },
                  ].map((lens) => (
                    <div key={lens.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12 }}>{lens.icon}</span>
                      <span style={{ fontSize: 11, color: lens.grade === "HIGH" ? "#10B981" : lens.grade === "MEDIUM" ? "#F59E0B" : lens.grade === "LOW" ? "#F97316" : "#6B7280", fontWeight: 600, minWidth: 16 }}>●</span>
                      <span style={{ fontSize: 12, color: "#94A3B8" }}>{lens.description}</span>
                    </div>
                  ))}
                </div>
                {results.threeLens.transaction && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                    {[
                      { v: (results.threeLens.transaction.saleToAskRatio * 100).toFixed(0) + "%", l: "Sale-to-Ask" },
                      { v: results.threeLens.transaction.daysOnMarket + " days", l: "Days on Market" },
                      { v: results.threeLens.transaction.reportedSales.toLocaleString(), l: "Closed Sales" },
                    ].map((m) => (
                      <div key={m.l} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>{m.v}</div>
                        <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase" }}>{m.l}</div>
                      </div>
                    ))}
                  </div>
                )}
                {results.threeLens.transaction && (
                  <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>
                    {results.threeLens.sellerBuyerGap !== null && results.threeLens.sellerBuyerGap > 5
                      ? `Based on ${results.threeLens.transaction.reportedSales.toLocaleString()} closed ${results.threeLens.transaction.subsector} transactions, sellers typically overask by ${results.threeLens.sellerBuyerGap.toFixed(0)}%. The median sold price is ${fmt(results.threeLens.transaction.medianSalePrice)} at ${results.threeLens.transaction.cashflowMultiple.toFixed(2)}x cash flow.`
                      : `Based on ${results.threeLens.transaction.reportedSales.toLocaleString()} closed ${results.threeLens.transaction.subsector} transactions, the median sold multiple is ${results.threeLens.transaction.cashflowMultiple.toFixed(2)}x with ${results.threeLens.transaction.daysOnMarket} median days on market.`
                    }
                  </div>
                )}
              </div>
            )}

            {/* ── PDF Export ── */}
            <div className="fu fd5" style={{ marginBottom: 14 }}>
              <button onClick={() => setShowPdfOptions(!showPdfOptions)} style={{ width: "100%", padding: "13px 20px", borderRadius: 10, border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.08)", color: "#34D399", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                📄 Download Deal Underwriting Memo
              </button>
              {showPdfOptions && (
                <div className="fu" style={{ marginTop: 10, padding: "16px 20px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", marginBottom: 12 }}>Customize your report:</div>
                  {[
                    { key: "aiAssessment", label: "Include AI Underwriting Memo" },
                    { key: "stressTest",   label: "Include Stress Test Scenarios" },
                    { key: "benchmarks",   label: "Include Industry Benchmarks" },
                  ].map((opt) => (
                    <label key={opt.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer", fontSize: 13, color: "#C9D1D9" }}>
                      <input type="checkbox" checked={pdfOptions[opt.key as keyof typeof pdfOptions]} onChange={(e) => setPdfOptions((p) => ({ ...p, [opt.key]: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "#10B981" }} />
                      {opt.label}
                    </label>
                  ))}
                  <button onClick={generateDealMemoPDF} disabled={pdfExporting} style={{ width: "100%", marginTop: 8, padding: "11px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#10B981,#059669)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: pdfExporting ? "wait" : "pointer", opacity: pdfExporting ? 0.7 : 1 }}>
                    {pdfExporting ? "Generating..." : "📄 Generate Underwriting Memo"}
                  </button>
                </div>
              )}
            </div>

            {/* ── CTAs ── */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              <a href="https://nextax.ai/acquisitions" style={{ flex: 2, padding: "13px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", color: "#fff", fontSize: 14, fontWeight: 700, textAlign: "center", textDecoration: "none", display: "block", minWidth: 180 }}>
                📋 Get Full NexTax Underwriting
              </a>
              <button onClick={handleReset} style={{ flex: 1, padding: "13px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#8896A6", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                ↺ Analyze Another Deal
              </button>
            </div>

            <p style={{ fontSize: 11, color: "#4B5563", lineHeight: 1.5, textAlign: "center" }}>
              This tool provides estimates based on industry averages and standard financial calculations. Not financial advice. Consult qualified professionals before making acquisition decisions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
