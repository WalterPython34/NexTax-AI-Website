"use client";

import React, { useState, useCallback, useRef } from "react";
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

interface FullScoreBreakdown {
  overall: number;
  riskLevel: "Low" | "Moderate" | "High" | "Critical";
  valuation: {
    score: number;
    multiple: number;
    marketRange: [number, number];
    fairValueEstimate: number;
    verdict: string;
    flags: string[];
  };
  debtRisk: {
    score: number;
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
    industryGrowth: string;
    saturationLevel: string;
    verdict: string;
    flags: string[];
  };
  industryRisk: {
    score: number;
    marginRange: [number, number];
    verdict: string;
    flags: string[];
  };
  operationalRisk: {
    score: number;
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
  redFlags: string[];
  greenFlags: string[];
  aiInsight: string | null;
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

// ─── INDUSTRY DATA (EXPANDED) ───────────────────────────────────────────────

const INDUSTRIES: Record<string, {
  label: string;
  typicalMultiple: [number, number];
  marginRange: [number, number];
  growth: string;
  riskFactor: number;
  avgRevenuePerEmployee: number;
  laborRatioRange: string;
  category: string;
}> = {
  laundromat: { label: "Laundromat", typicalMultiple: [2.5, 4.0], marginRange: [25, 40], growth: "Stable", riskFactor: 0.85, avgRevenuePerEmployee: 120000, laborRatioRange: "15-25%", category: "Service" },
  hvac: { label: "HVAC", typicalMultiple: [2.5, 4.5], marginRange: [15, 30], growth: "Growing", riskFactor: 0.75, avgRevenuePerEmployee: 95000, laborRatioRange: "30-45%", category: "Trades" },
  landscaping: { label: "Landscaping", typicalMultiple: [1.5, 3.0], marginRange: [10, 25], growth: "Stable", riskFactor: 0.90, avgRevenuePerEmployee: 55000, laborRatioRange: "40-55%", category: "Service" },
  carwash: { label: "Car Wash", typicalMultiple: [3.0, 5.0], marginRange: [25, 45], growth: "Growing", riskFactor: 0.80, avgRevenuePerEmployee: 100000, laborRatioRange: "20-30%", category: "Service" },
  dental: { label: "Dental Practice", typicalMultiple: [3.0, 5.5], marginRange: [20, 40], growth: "Growing", riskFactor: 0.65, avgRevenuePerEmployee: 180000, laborRatioRange: "25-35%", category: "Healthcare" },
  gym: { label: "Gym / Fitness Center", typicalMultiple: [2.0, 4.0], marginRange: [15, 35], growth: "Stable", riskFactor: 0.95, avgRevenuePerEmployee: 70000, laborRatioRange: "30-40%", category: "Service" },
  restaurant: { label: "Restaurant", typicalMultiple: [1.5, 3.0], marginRange: [5, 15], growth: "Volatile", riskFactor: 1.10, avgRevenuePerEmployee: 50000, laborRatioRange: "30-40%", category: "Food" },
  autorepair: { label: "Auto Repair", typicalMultiple: [2.0, 3.5], marginRange: [15, 30], growth: "Stable", riskFactor: 0.85, avgRevenuePerEmployee: 85000, laborRatioRange: "30-40%", category: "Service" },
  cleaning: { label: "Cleaning Service", typicalMultiple: [1.5, 3.0], marginRange: [15, 30], growth: "Growing", riskFactor: 0.80, avgRevenuePerEmployee: 45000, laborRatioRange: "45-60%", category: "Service" },
  ecommerce: { label: "Ecommerce Brand", typicalMultiple: [2.5, 4.5], marginRange: [15, 35], growth: "Variable", riskFactor: 0.95, avgRevenuePerEmployee: 250000, laborRatioRange: "10-20%", category: "Digital" },
  saas: { label: "SaaS Product", typicalMultiple: [3.0, 6.0], marginRange: [60, 85], growth: "Growing", riskFactor: 0.70, avgRevenuePerEmployee: 200000, laborRatioRange: "40-55%", category: "Digital" },
  insurance: { label: "Insurance Agency", typicalMultiple: [2.0, 3.5], marginRange: [20, 40], growth: "Stable", riskFactor: 0.70, avgRevenuePerEmployee: 150000, laborRatioRange: "25-35%", category: "Financial" },
  plumbing: { label: "Plumbing", typicalMultiple: [2.0, 4.0], marginRange: [15, 30], growth: "Growing", riskFactor: 0.75, avgRevenuePerEmployee: 90000, laborRatioRange: "30-45%", category: "Trades" },
  roofing: { label: "Roofing", typicalMultiple: [1.5, 3.5], marginRange: [15, 30], growth: "Stable", riskFactor: 0.90, avgRevenuePerEmployee: 75000, laborRatioRange: "35-50%", category: "Trades" },
  petcare: { label: "Pet Care / Grooming", typicalMultiple: [2.0, 4.0], marginRange: [20, 40], growth: "Growing", riskFactor: 0.80, avgRevenuePerEmployee: 60000, laborRatioRange: "35-45%", category: "Service" },
  pharmacy: { label: "Pharmacy", typicalMultiple: [2.5, 4.0], marginRange: [18, 30], growth: "Stable", riskFactor: 0.75, avgRevenuePerEmployee: 300000, laborRatioRange: "15-25%", category: "Healthcare" },
  daycare: { label: "Daycare / Childcare", typicalMultiple: [2.0, 4.0], marginRange: [15, 30], growth: "Growing", riskFactor: 0.85, avgRevenuePerEmployee: 40000, laborRatioRange: "50-65%", category: "Service" },
  medspa: { label: "Med Spa / Aesthetics", typicalMultiple: [3.0, 5.0], marginRange: [25, 45], growth: "Growing", riskFactor: 0.80, avgRevenuePerEmployee: 120000, laborRatioRange: "25-35%", category: "Healthcare" },
  accounting: { label: "Accounting / Tax Firm", typicalMultiple: [1.5, 3.5], marginRange: [30, 55], growth: "Stable", riskFactor: 0.60, avgRevenuePerEmployee: 110000, laborRatioRange: "40-55%", category: "Professional Services" },
  electrical: { label: "Electrical Contractor", typicalMultiple: [2.0, 4.0], marginRange: [15, 30], growth: "Growing", riskFactor: 0.75, avgRevenuePerEmployee: 90000, laborRatioRange: "35-50%", category: "Trades" },
  healthcare: { label: "Healthcare / Home Health", typicalMultiple: [3.0, 6.0], marginRange: [15, 35], growth: "Growing", riskFactor: 0.70, avgRevenuePerEmployee: 70000, laborRatioRange: "50-65%", category: "Healthcare" },
  transportation: { label: "Transportation / Trucking", typicalMultiple: [2.0, 4.0], marginRange: [10, 25], growth: "Stable", riskFactor: 0.85, avgRevenuePerEmployee: 130000, laborRatioRange: "30-45%", category: "Logistics" },
  printing: { label: "Printing / Marketing", typicalMultiple: [1.5, 3.0], marginRange: [15, 30], growth: "Variable", riskFactor: 0.90, avgRevenuePerEmployee: 85000, laborRatioRange: "35-50%", category: "Service" },
  storage: { label: "Self-Storage", typicalMultiple: [4.0, 8.0], marginRange: [40, 65], growth: "Growing", riskFactor: 0.60, avgRevenuePerEmployee: 200000, laborRatioRange: "5-15%", category: "Real Estate" },
  painting: { label: "Painting Contractor", typicalMultiple: [1.5, 3.0], marginRange: [15, 30], growth: "Stable", riskFactor: 0.90, avgRevenuePerEmployee: 65000, laborRatioRange: "40-55%", category: "Trades" },
  security: { label: "Security Services", typicalMultiple: [2.5, 4.5], marginRange: [15, 30], growth: "Growing", riskFactor: 0.75, avgRevenuePerEmployee: 50000, laborRatioRange: "55-70%", category: "Service" },
};

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

// ─── SCORING ENGINE ──────────────────────────────────────────────────────────

function calculateFullScores(inputs: DealInputs): FullScoreBreakdown | null {
  const revenue = parseFloat(inputs.revenue.replace(/,/g, ""));
  const sde = parseFloat(inputs.sde.replace(/,/g, ""));
  const price = parseFloat(inputs.askingPrice.replace(/,/g, ""));
  const debtPct = parseFloat(inputs.debtPercent) / 100;
  const rate = parseFloat(inputs.interestRate) / 100;
  const term = parseFloat(inputs.loanTermYears);
  const industry = INDUSTRIES[inputs.industry];
  const yearsInBiz = parseFloat(inputs.yearsInBusiness) || 0;
  const employees = parseFloat(inputs.employeeCount) || 1;
  const revenueGrowth = inputs.revenueGrowth;
  const custConcentration = inputs.customerConcentration;

  if (!revenue || !sde || !price || !industry || isNaN(debtPct) || isNaN(rate) || isNaN(term)) return null;

  const redFlags: string[] = [];
  const greenFlags: string[] = [];

  // ── VALUATION ──
  const multiple = price / sde;
  const [lowMult, highMult] = industry.typicalMultiple;
  const midMult = (lowMult + highMult) / 2;
  let valuationScore: number;
  if (multiple <= midMult) {
    valuationScore = Math.min(95, 70 + (midMult - multiple) / midMult * 50);
  } else if (multiple <= highMult) {
    valuationScore = 70 - ((multiple - midMult) / (highMult - midMult)) * 30;
  } else {
    valuationScore = Math.max(5, 40 - ((multiple - highMult) / highMult) * 60);
  }
  valuationScore = Math.round(Math.max(5, Math.min(98, valuationScore)));

  const fairValueEstimate = Math.round(sde * midMult);
  const valuationFlags: string[] = [];
  if (multiple > highMult * 1.2) { valuationFlags.push("Asking price significantly exceeds industry norms"); redFlags.push("Overvalued by " + Math.round(((multiple / highMult) - 1) * 100) + "% vs industry ceiling"); }
  else if (multiple > highMult) { valuationFlags.push("Price at the top of market range — negotiate down"); }
  else if (multiple < lowMult) { valuationFlags.push("Below market — investigate why (could signal hidden issues)"); greenFlags.push("Priced below market multiples"); }
  else { greenFlags.push("Valuation within fair market range"); }

  const valuationVerdict = multiple <= lowMult
    ? "Below market — strong position, but verify why"
    : multiple <= midMult
    ? "Fair value — solid entry point"
    : multiple <= highMult
    ? "Upper range — justify with growth or strategic value"
    : "Above market — significant overpayment risk";

  // ── DEBT / DSCR ──
  const loanAmount = price * debtPct;
  const downPayment = price - loanAmount;
  const monthlyRate = rate / 12;
  const numPayments = term * 12;
  const monthlyPayment = monthlyRate > 0
    ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
    : loanAmount / numPayments;
  const annualPayment = monthlyPayment * 12;
  const dscr = annualPayment > 0 ? sde / annualPayment : 99;
  const breakEvenMonths = Math.ceil(downPayment / (sde / 12 - monthlyPayment));

  let debtScore: number;
  if (dscr >= 2.0) debtScore = 92;
  else if (dscr >= 1.5) debtScore = 75 + (dscr - 1.5) * 34;
  else if (dscr >= 1.25) debtScore = 55 + (dscr - 1.25) * 80;
  else if (dscr >= 1.0) debtScore = 30 + (dscr - 1.0) * 100;
  else debtScore = Math.max(5, dscr * 30);
  debtScore = Math.round(Math.max(5, Math.min(98, debtScore)));

  const debtFlags: string[] = [];
  if (dscr < 1.0) { debtFlags.push("Cash flow does not cover debt service"); redFlags.push("DSCR below 1.0 — deal cannot service its own debt"); }
  else if (dscr < 1.25) { debtFlags.push("DSCR below typical SBA minimum of 1.25"); redFlags.push("Tight debt coverage — no room for revenue dips"); }
  else if (dscr >= 1.5) { greenFlags.push("Healthy DSCR with comfortable margin"); }
  if (downPayment > 0 && breakEvenMonths > 60) { debtFlags.push("Down payment recovery exceeds 5 years"); }
  if (debtPct > 0.9) { debtFlags.push("Very high leverage — minimal equity cushion"); }

  const debtVerdict = dscr >= 1.5
    ? "Strong debt coverage — comfortable cash flow margin"
    : dscr >= 1.25
    ? "Acceptable coverage — meets lender minimums"
    : dscr >= 1.0
    ? "Tight coverage — minimal margin for error"
    : "Insufficient — deal cannot service its own debt";

  // ── MARKET RISK ──
  const growthScores: Record<string, number> = { Growing: 82, Stable: 65, Variable: 45, Volatile: 28 };
  let marketScore = growthScores[industry.growth] || 50;
  const marketFlags: string[] = [];

  // Location-based adjustments
  if (inputs.state) {
    const highGrowthStates = ["TX", "FL", "TN", "NC", "AZ", "GA", "CO", "UT", "ID", "NV"];
    const decliningStates = ["WV", "MS", "LA", "AK"];
    if (highGrowthStates.includes(inputs.state)) { marketScore += 5; greenFlags.push("Located in high-growth state"); }
    if (decliningStates.includes(inputs.state)) { marketScore -= 5; marketFlags.push("State shows below-average economic growth"); }
  }

  let saturationLevel = "Moderate";
  if (industry.category === "Service" || industry.category === "Trades") {
    saturationLevel = "Low-Moderate";
    marketFlags.push("Service businesses have natural geographic moats");
  } else if (industry.category === "Digital") {
    saturationLevel = "High";
    marketFlags.push("Digital businesses face national/global competition");
  } else if (industry.category === "Food") {
    saturationLevel = "High";
    marketFlags.push("Restaurant industry has high competition and failure rates");
    redFlags.push("Restaurants have among the highest failure rates of any industry");
  }

  marketScore = Math.round(Math.max(10, Math.min(95, marketScore)));
  const marketVerdict = marketScore >= 70
    ? "Favorable market conditions"
    : marketScore >= 50
    ? "Stable market — predictable demand"
    : "Challenging market — higher operational risk";

  // ── INDUSTRY RISK ──
  let industryScore = Math.round(Math.max(15, Math.min(95, (1 - industry.riskFactor) * 100 + 40)));
  const industryFlags: string[] = [];

  const sdeMargin = (sde / revenue) * 100;
  const [lowMargin, highMargin] = industry.marginRange;
  if (sdeMargin < lowMargin * 0.7) {
    industryScore -= 10;
    industryFlags.push("SDE margin significantly below industry average");
    redFlags.push("Margins " + Math.round(lowMargin - sdeMargin) + " points below industry floor");
  } else if (sdeMargin > highMargin * 1.1) {
    industryFlags.push("Margins above industry average — verify sustainability");
    greenFlags.push("Above-average profitability margins");
  } else {
    greenFlags.push("Margins within industry norms");
  }

  industryScore = Math.round(Math.max(10, Math.min(95, industryScore)));
  const industryVerdict = industryScore >= 70
    ? "Lower-risk industry with strong fundamentals"
    : industryScore >= 45
    ? "Moderate industry risk — typical for this sector"
    : "Higher-risk industry — requires experienced operator";

  // ── OPERATIONAL RISK ──
  let operationalScore = 65;
  const operationalFlags: string[] = [];

  if (yearsInBiz >= 10) { operationalScore += 10; greenFlags.push("Business has 10+ year track record"); }
  else if (yearsInBiz >= 5) { operationalScore += 5; }
  else if (yearsInBiz > 0 && yearsInBiz < 3) { operationalScore -= 10; operationalFlags.push("Business is less than 3 years old — limited track record"); redFlags.push("Young business with unproven sustainability"); }

  if (inputs.ownerOperated) { operationalFlags.push("Owner-operated — transition risk if owner leaves"); }
  else { operationalScore += 5; greenFlags.push("Not owner-dependent — easier transition"); }

  if (revenueGrowth === "declining") { operationalScore -= 15; redFlags.push("Revenue is declining"); operationalFlags.push("Declining revenue demands explanation"); }
  else if (revenueGrowth === "growing") { operationalScore += 10; greenFlags.push("Revenue trending upward"); }
  else if (revenueGrowth === "flat") { operationalFlags.push("Flat revenue — limited organic growth"); }

  if (custConcentration === "high") { operationalScore -= 12; redFlags.push("High customer concentration — single-point-of-failure risk"); operationalFlags.push("Top customer represents outsized revenue share"); }
  else if (custConcentration === "low") { operationalScore += 5; greenFlags.push("Diversified customer base"); }

  const revenuePerEmployee = revenue / employees;
  if (revenuePerEmployee < industry.avgRevenuePerEmployee * 0.6) {
    operationalFlags.push("Revenue per employee below industry average — possible overstaffing");
  }

  operationalScore = Math.round(Math.max(5, Math.min(98, operationalScore)));
  const operationalVerdict = operationalScore >= 70
    ? "Strong operational profile"
    : operationalScore >= 45
    ? "Moderate operational risk — manageable with planning"
    : "Significant operational concerns to address";

  // ── BENCHMARKS ──
  const benchmarks = {
    typicalMargin: industry.marginRange,
    actualMargin: Math.round(sdeMargin * 10) / 10,
    typicalMultiple: industry.typicalMultiple,
    revenuePerEmployee: Math.round(revenuePerEmployee),
    industryAvgRevenuePerEmployee: industry.avgRevenuePerEmployee,
    laborRatio: industry.laborRatioRange,
  };

  // ── OVERALL ──
  const overall = Math.round(
    Math.max(5, Math.min(98,
      valuationScore * 0.25 +
      debtScore * 0.25 +
      marketScore * 0.15 +
      industryScore * 0.15 +
      operationalScore * 0.20
    ))
  );

  const riskLevel: FullScoreBreakdown["riskLevel"] =
    overall >= 70 ? "Low" : overall >= 50 ? "Moderate" : overall >= 30 ? "High" : "Critical";

  return {
    overall,
    riskLevel,
    valuation: { score: valuationScore, multiple, marketRange: [lowMult, highMult], fairValueEstimate, verdict: valuationVerdict, flags: valuationFlags },
    debtRisk: { score: debtScore, dscr, annualPayment, monthlyPayment, loanAmount, downPayment, breakEvenMonths: breakEvenMonths > 0 ? breakEvenMonths : 0, verdict: debtVerdict, flags: debtFlags },
    marketRisk: { score: marketScore, industryGrowth: industry.growth, saturationLevel, verdict: marketVerdict, flags: marketFlags },
    industryRisk: { score: industryScore, marginRange: industry.marginRange, verdict: industryVerdict, flags: industryFlags },
    operationalRisk: { score: operationalScore, verdict: operationalVerdict, flags: operationalFlags },
    benchmarks,
    redFlags,
    greenFlags,
    aiInsight: null,
  };
}

// ─── UI HELPERS ──────────────────────────────────────────────────────────────

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

function getScoreColor(score: number): string {
  if (score >= 70) return "#10B981";
  if (score >= 50) return "#F59E0B";
  if (score >= 30) return "#F97316";
  return "#EF4444";
}

function getRiskBg(level: string): string {
  switch (level) {
    case "Low": return "linear-gradient(135deg, #065F46 0%, #10B981 100%)";
    case "Moderate": return "linear-gradient(135deg, #92400E 0%, #F59E0B 100%)";
    case "High": return "linear-gradient(135deg, #9A3412 0%, #F97316 100%)";
    case "Critical": return "linear-gradient(135deg, #991B1B 0%, #EF4444 100%)";
    default: return "linear-gradient(135deg, #374151, #6B7280)";
  }
}

function renderMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ color: "#E2E8F0", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function ScoreRing({ score, size = 140, strokeWidth = 8 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s ease-out" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: "#8896A6", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>Deal Score</span>
      </div>
    </div>
  );
}

function SubScoreBar({ label, score, icon }: { label: string; score: number; icon: string }) {
  const color = getScoreColor(score);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: "#C9D1D9", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
          <span>{icon}</span> {label}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{score}</span>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 3, transition: "width 1s ease-out" }} />
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, prefix, suffix, type = "text", small }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  prefix?: string; suffix?: string; type?: string; small?: boolean;
}) {
  return (
    <div style={{ marginBottom: small ? 0 : 16 }}>
      <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {prefix && <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6B7280", fontSize: 14 }}>{prefix}</span>}
        <input
          type={type} placeholder={placeholder} value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%", padding: `10px ${suffix ? "36px" : "12px"} 10px ${prefix ? "26px" : "12px"}`,
            borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14,
            fontFamily: "'DM Sans', sans-serif", outline: "none",
          }}
        />
        {suffix && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#6B7280", fontSize: 12 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function SectionCard({ title, children, icon, accentColor }: {
  title: string; children: React.ReactNode; icon: string; accentColor?: string;
}) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14, padding: "20px 22px", borderLeft: accentColor ? `3px solid ${accentColor}` : undefined,
    }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}>
        <span>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function DealRiskAnalyzer() {
  const [gated, setGated] = useState(true);
  const [gateEmail, setGateEmail] = useState("");
  const [gateName, setGateName] = useState("");
  const [gateLoading, setGateLoading] = useState(false);

  const [step, setStep] = useState(1);
  const [inputs, setInputs] = useState<DealInputs>({
    revenue: "", sde: "", askingPrice: "", industry: "",
    city: "", state: "", zipCode: "",
    debtPercent: "80", interestRate: "10.5", loanTermYears: "10",
    downPaymentSource: "savings",
    hasRealEstate: false, ownerOperated: true,
    yearsInBusiness: "", employeeCount: "",
    revenueGrowth: "flat", customerConcentration: "moderate",
  });
  const [results, setResults] = useState<FullScoreBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [pdfOptions, setPdfOptions] = useState({ aiAssessment: true, benchmarks: true, industryComparison: true });
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const set = (field: keyof DealInputs, value: string | boolean) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const setCurrency = (field: keyof DealInputs, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    set(field, cleaned ? parseInt(cleaned).toLocaleString() : "");
  };

  const canProceedStep1 = inputs.revenue && inputs.sde && inputs.askingPrice && inputs.industry;
  const canProceedStep2 = true; // Location is optional
  const canSubmit = canProceedStep1;

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const scores = calculateFullScores(inputs);
    if (scores) {
      setResults(scores);
      setStep(4);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      fetchAIInsight(scores);
      fetchBenchmarks(scores);
      recordDeal(scores);
    }
    setLoading(false);
  };

  const fetchBenchmarks = async (scores: FullScoreBreakdown) => {
    try {
      const revenue = parseFloat(inputs.revenue.replace(/,/g, ""));
      const sde = parseFloat(inputs.sde.replace(/,/g, ""));
      const price = parseFloat(inputs.askingPrice.replace(/,/g, ""));

      const res = await fetch("/api/benchmark-lookup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry: inputs.industry, state: inputs.state || null, revenue, sde, asking_price: price }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;

      const b = data.benchmarks;
      const a = data.analysis;
      const c = data.confidence;

      setResults((prev) => {
        if (!prev) return prev;

        // Recompute valuation score using transaction data
        let newValScore = prev.valuation.score;
        let newMarketRange = prev.valuation.marketRange;
        let newFairValue = prev.valuation.fairValueEstimate;
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
            newValScore * (w.valuation / 100) +
            prev.debtRisk.score * (w.debt / 100) +
            prev.marketRisk.score * ((w.financial + w.liquidity) / 200) +
            prev.industryRisk.score * ((w.financial + w.liquidity) / 200)
          )));
        }

        const newRiskLevel: FullScoreBreakdown["riskLevel"] = newOverall >= 70 ? "Low" : newOverall >= 50 ? "Moderate" : newOverall >= 30 ? "High" : "Critical";

        const newRedFlags = [...prev.redFlags];
        const newGreenFlags = [...prev.greenFlags];

        if (b.transaction && a.sellerBuyerGap && a.sellerBuyerGap > 20) {
          newRedFlags.push(`Sellers in this industry typically overask by ${a.sellerBuyerGap.toFixed(0)}%`);
        }
        if (b.transaction && b.transaction.saleToAskRatio < 0.90) {
          newGreenFlags.push(`Typical negotiation: ${Math.round((1 - b.transaction.saleToAskRatio) * 100)}% off asking price`);
        }
        if (b.transaction && b.transaction.daysOnMarket > 250) {
          newGreenFlags.push("Long average days on market — leverage for negotiation");
        }

        return {
          ...prev,
          overall: newOverall,
          riskLevel: newRiskLevel,
          valuation: { ...prev.valuation, score: newValScore, marketRange: newMarketRange, fairValueEstimate: newFairValue },
          redFlags: newRedFlags,
          greenFlags: newGreenFlags,
          threeLens: {
            listing: b.listing ? { medianMultiple: b.listing.medianMultiple, sampleSize: b.listing.sampleSize } : null,
            transaction: b.transaction ? {
              cashflowMultiple: b.transaction.cashflowMultiple,
              saleToAskRatio: b.transaction.saleToAskRatio,
              daysOnMarket: b.transaction.daysOnMarket,
              reportedSales: b.transaction.reportedSales,
              subsector: b.transaction.subsector,
              medianSalePrice: b.transaction.medianSalePrice,
            } : null,
            financial: b.financial ? { sdeMargin: b.financial.sdeMargin } : null,
            sellerBuyerGap: a.sellerBuyerGap,
            estimatedNegotiatedPrice: a.estimatedNegotiatedPrice,
            smartOfferRange: a.smartOfferRange,
            confidence: {
              overall: c.overall,
              listing: { grade: c.listing.grade, description: c.listing.description, sampleSize: c.listing.sampleSize },
              transaction: { grade: c.transaction.grade, description: c.transaction.description, sampleSize: c.transaction.sampleSize },
              financial: { grade: c.financial.grade, description: c.financial.description, sampleSize: c.financial.sampleSize },
              weights: c.weights,
            },
          },
        };
      });
    } catch (err) {
      console.error("Benchmark fetch error:", err);
    }
  };

  const recordDeal = async (scores: FullScoreBreakdown) => {
    try {
      await fetch("/api/record-deal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool_used: "risk_analyzer",
          industry: inputs.industry,
          revenue: inputs.revenue,
          sde: inputs.sde,
          asking_price: inputs.askingPrice,
          debt_percent: parseFloat(inputs.debtPercent),
          interest_rate: parseFloat(inputs.interestRate),
          term_years: parseInt(inputs.loanTermYears),
          city: inputs.city || null,
          state: inputs.state || null,
          zip_code: inputs.zipCode || null,
          employees: inputs.employeeCount ? parseInt(inputs.employeeCount) : null,
          years_in_business: inputs.yearsInBusiness ? parseInt(inputs.yearsInBusiness) : null,
          revenue_trend: inputs.revenueGrowth || null,
          customer_concentration: inputs.customerConcentration || null,
          owner_operated: inputs.ownerOperated,
          has_real_estate: inputs.hasRealEstate,
          valuation_multiple: +scores.valuation.multiple.toFixed(2),
          dscr: +scores.debtRisk.dscr.toFixed(2),
          monthly_payment: Math.round(scores.debtRisk.monthlyPayment),
          fair_value: scores.valuation.fairValueEstimate,
          recommended_offer_low: null,
          recommended_offer_high: null,
          overall_score: scores.overall,
          risk_level: scores.riskLevel,
          valuation_score: scores.valuation.score,
          debt_score: scores.debtRisk.score,
          market_score: scores.marketRisk.score,
          industry_score: scores.industryRisk.score,
          operational_score: scores.operationalRisk.score,
          red_flags: scores.redFlags,
          green_flags: scores.greenFlags,
        }),
      });
    } catch { /* non-blocking */ }
  };

  const fetchAIInsight = async (scores: FullScoreBreakdown) => {
    setAiLoading(true);
    const industry = INDUSTRIES[inputs.industry];
    try {
      const response = await fetch("/api/deal-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `You are a senior M&A advisor specializing in small business acquisitions. Provide a comprehensive but concise deal assessment (5-6 sentences). Do NOT use markdown bold syntax — write in plain text.

DEAL PARAMETERS:
Industry: ${industry?.label} (${industry?.category})
Location: ${inputs.city ? inputs.city + ", " : ""}${inputs.state || "Not specified"}
Revenue: $${inputs.revenue} | SDE: $${inputs.sde} | Asking: $${inputs.askingPrice}
Multiple: ${scores.valuation.multiple.toFixed(2)}x SDE (Market: ${scores.valuation.marketRange[0]}-${scores.valuation.marketRange[1]}x)
Fair Value Estimate: ${formatCurrency(scores.valuation.fairValueEstimate)}
SDE Margin: ${scores.benchmarks.actualMargin}% (Industry: ${scores.benchmarks.typicalMargin[0]}-${scores.benchmarks.typicalMargin[1]}%)
DSCR: ${scores.debtRisk.dscr.toFixed(2)} | Monthly Debt: ${formatCurrency(scores.debtRisk.monthlyPayment)}
Down Payment: ${formatCurrency(scores.debtRisk.downPayment)}
Years in Business: ${inputs.yearsInBusiness || "Unknown"} | Employees: ${inputs.employeeCount || "Unknown"}
Revenue Trend: ${inputs.revenueGrowth} | Customer Concentration: ${inputs.customerConcentration}
Owner-Operated: ${inputs.ownerOperated ? "Yes" : "No"}

SCORES: Overall ${scores.overall}/100 (${scores.riskLevel}) | Valuation ${scores.valuation.score} | Debt ${scores.debtRisk.score} | Market ${scores.marketRisk.score} | Industry ${scores.industryRisk.score} | Operational ${scores.operationalRisk.score}

RED FLAGS: ${scores.redFlags.join("; ") || "None"}
GREEN FLAGS: ${scores.greenFlags.join("; ") || "None"}

Structure your response as:
1. Overall assessment (1-2 sentences)
2. Biggest risk and why it matters
3. Biggest opportunity
4. Specific negotiation recommendation with a suggested counter-offer price
5. One thing to verify in diligence`,
          }],
        }),
      });
      const data = await response.json();
      const insight = data.content?.map((b: { type: string; text?: string }) => (b.type === "text" ? b.text : "")).join("") || null;
      setResults((prev) => prev ? { ...prev, aiInsight: insight } : prev);
    } catch {
      setResults((prev) => prev ? {
        ...prev,
        aiInsight: `This ${industry?.label.toLowerCase()} at ${scores.valuation.multiple.toFixed(1)}x SDE ${scores.valuation.multiple > scores.valuation.marketRange[1] ? "exceeds" : "falls within"} typical market multiples (${scores.valuation.marketRange[0]}-${scores.valuation.marketRange[1]}x). With a DSCR of ${scores.debtRisk.dscr.toFixed(2)}, ${scores.debtRisk.dscr >= 1.25 ? "the debt is serviceable" : "debt coverage is a concern"}. Fair value estimate based on industry averages would be approximately ${formatCurrency(scores.valuation.fairValueEstimate)}. ${scores.redFlags.length > 0 ? "Key risk: " + scores.redFlags[0] + "." : ""} ${scores.greenFlags.length > 0 ? "Strength: " + scores.greenFlags[0] + "." : ""}`,
      } : prev);
    }
    setAiLoading(false);
  };

  const generateDealMemoPDF = async () => {
    if (!results) return;
    setPdfExporting(true);
    const ind = INDUSTRIES[inputs.industry];
    const location = [inputs.city, inputs.state].filter(Boolean).join(", ");

    // Create multi-page PDF using Canvas
    const pages: HTMLCanvasElement[] = [];
    const W = 816, H = 1056; // Letter size at 96dpi

    // ── Helper functions
    const newPage = () => {
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#0A0E14"; ctx.fillRect(0, 0, W, H);
      // Header bar
      ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.fillRect(0, 0, W, 44);
      ctx.fillStyle = "#6366F1"; ctx.font = "bold 13px monospace"; ctx.fillText("NEXTAX", 24, 28);
      ctx.fillStyle = "#6B7280"; ctx.font = "400 13px monospace"; ctx.fillText(".AI", 82, 28);
      ctx.fillStyle = "#374151"; ctx.font = "400 10px monospace";
      ctx.textAlign = "right"; ctx.fillText("DEAL INTELLIGENCE PLATFORM", W - 24, 28); ctx.textAlign = "left";
      // Left accent
      ctx.fillStyle = "#6366F1"; ctx.fillRect(0, 0, 3, H);
      pages.push(c);
      return ctx;
    };

    const drawBar = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, score: number, label: string) => {
      const col = score >= 70 ? "#10B981" : score >= 50 ? "#F59E0B" : score >= 30 ? "#F97316" : "#EF4444";
      ctx.fillStyle = "#374151"; ctx.font = "400 11px sans-serif"; ctx.fillText(label, x, y);
      ctx.fillStyle = col; ctx.font = "bold 12px monospace"; ctx.textAlign = "right"; ctx.fillText(String(score), x + w, y); ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.beginPath(); ctx.roundRect(x, y + 6, w, 6, 3); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, y + 6, w * (score / 100), 6, 3); ctx.fill();
    };

    const fmt$ = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

    // ════════════════════════════════════════════════════════
    // PAGE 1: Deal Snapshot + Valuation + Debt
    // ════════════════════════════════════════════════════════
    let ctx = newPage();
    let y = 80;

    // Title block
    ctx.fillStyle = "#F59E0B"; ctx.font = "bold 11px monospace"; ctx.fillText("DEAL MEMO", 40, y);
    y += 28;
    ctx.fillStyle = "#E2E8F0"; ctx.font = "bold 28px sans-serif";
    ctx.fillText(`${location ? location + " " : ""}${ind?.label || ""}`, 40, y);
    y += 20;
    ctx.fillStyle = "#6B7280"; ctx.font = "400 12px sans-serif";
    ctx.fillText(`Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, 40, y);
    y += 40;

    // ── DEAL SNAPSHOT
    ctx.fillStyle = "#818CF8"; ctx.font = "bold 11px monospace"; ctx.fillText("1. DEAL SNAPSHOT", 40, y);
    y += 24;

    // Score circle
    const scx = 120, scy = y + 60, sr = 50;
    ctx.beginPath(); ctx.arc(scx, scy, sr, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 8; ctx.stroke();
    const scCol = results.overall >= 70 ? "#10B981" : results.overall >= 50 ? "#F59E0B" : results.overall >= 30 ? "#F97316" : "#EF4444";
    ctx.beginPath(); ctx.arc(scx, scy, sr, -Math.PI / 2, -Math.PI / 2 + (results.overall / 100) * Math.PI * 2);
    ctx.strokeStyle = scCol; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.stroke();
    ctx.fillStyle = scCol; ctx.font = "bold 36px monospace"; ctx.textAlign = "center";
    ctx.fillText(String(results.overall), scx, scy + 10);
    ctx.fillStyle = "#6B7280"; ctx.font = "400 8px sans-serif"; ctx.fillText("DEAL SCORE", scx, scy + 26);
    ctx.textAlign = "left";
    // Risk badge
    ctx.fillStyle = scCol; ctx.beginPath(); ctx.roundRect(scx - 40, scy + 38, 80, 22, 11); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(results.riskLevel + " Risk", scx, scy + 53); ctx.textAlign = "left";

    // Metrics table (right of score)
    const mx = 220;
    const metrics = [
      ["Industry", ind?.label || ""],
      ["Revenue", fmt$(parseFloat(inputs.revenue.replace(/,/g, "")))],
      ["SDE", fmt$(parseFloat(inputs.sde.replace(/,/g, "")))],
      ["Asking Price", fmt$(parseFloat(inputs.askingPrice.replace(/,/g, "")))],
      ["Location", location || "Not specified"],
      ["Years in Business", inputs.yearsInBusiness || "N/A"],
      ["Employees", inputs.employeeCount || "N/A"],
      ["Revenue Trend", inputs.revenueGrowth || "N/A"],
    ];
    metrics.forEach((m, i) => {
      const my = y + 10 + i * 22;
      ctx.fillStyle = "#6B7280"; ctx.font = "400 11px sans-serif"; ctx.fillText(m[0], mx, my);
      ctx.fillStyle = "#E2E8F0"; ctx.font = "500 11px monospace"; ctx.fillText(m[1], mx + 180, my);
    });
    y += 200;

    // ── VALUATION ANALYSIS
    ctx.fillStyle = "#818CF8"; ctx.font = "bold 11px monospace"; ctx.fillText("2. VALUATION ANALYSIS", 40, y);
    y += 24;
    ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.beginPath(); ctx.roundRect(40, y, W - 80, 100, 8); ctx.fill();
    const valMetrics = [
      ["Asking Multiple", results.valuation.multiple.toFixed(2) + "x SDE"],
      ["Industry Range", results.valuation.marketRange[0] + "–" + results.valuation.marketRange[1] + "x SDE"],
      ["Fair Value Estimate", fmt$(results.valuation.fairValueEstimate)],
      ["Valuation Verdict", results.valuation.verdict],
    ];
    valMetrics.forEach((m, i) => {
      ctx.fillStyle = "#6B7280"; ctx.font = "400 11px sans-serif"; ctx.fillText(m[0], 60, y + 22 + i * 22);
      ctx.fillStyle = "#E2E8F0"; ctx.font = "500 11px monospace"; ctx.fillText(m[1], 280, y + 22 + i * 22);
    });
    y += 124;

    // ── DEBT & FINANCING
    ctx.fillStyle = "#818CF8"; ctx.font = "bold 11px monospace"; ctx.fillText("3. DEBT & FINANCING", 40, y);
    y += 24;
    ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.beginPath(); ctx.roundRect(40, y, W - 80, 110, 8); ctx.fill();
    const debtMetrics = [
      ["Estimated Loan", fmt$(results.debtRisk.loanAmount)],
      ["Down Payment", fmt$(results.debtRisk.downPayment)],
      ["DSCR", results.debtRisk.dscr.toFixed(2) + (results.debtRisk.dscr >= 1.25 ? " (PASS)" : " (BELOW MIN)")],
      ["Monthly Debt Payment", fmt$(results.debtRisk.monthlyPayment)],
      ["Annual Debt Service", fmt$(results.debtRisk.annualPayment)],
    ];
    debtMetrics.forEach((m, i) => {
      ctx.fillStyle = "#6B7280"; ctx.font = "400 11px sans-serif"; ctx.fillText(m[0], 60, y + 22 + i * 20);
      ctx.fillStyle = "#E2E8F0"; ctx.font = "500 11px monospace"; ctx.fillText(m[1], 280, y + 22 + i * 20);
    });
    y += 134;

    // ── RISK BREAKDOWN
    ctx.fillStyle = "#818CF8"; ctx.font = "bold 11px monospace"; ctx.fillText("4. RISK BREAKDOWN", 40, y);
    y += 24;
    const riskBars = [
      { label: "Valuation Risk", score: results.valuation.score },
      { label: "Debt Risk", score: results.debtRisk.score },
      { label: "Market Risk", score: results.marketRisk.score },
      { label: "Industry Risk", score: results.industryRisk.score },
      { label: "Operational Risk", score: results.operationalRisk.score },
    ];
    riskBars.forEach((b, i) => { drawBar(ctx, 60, y + i * 30, 500, b.score, b.label); });
    y += riskBars.length * 30 + 20;

    // Red/green flags
    if (results.redFlags.length > 0) {
      ctx.fillStyle = "#EF4444"; ctx.font = "bold 10px monospace"; ctx.fillText("RED FLAGS", 60, y);
      y += 16;
      results.redFlags.forEach((f) => {
        ctx.fillStyle = "#FCA5A5"; ctx.font = "400 11px sans-serif"; ctx.fillText("▸ " + f, 70, y);
        y += 16;
      });
      y += 8;
    }
    if (results.greenFlags.length > 0) {
      ctx.fillStyle = "#10B981"; ctx.font = "bold 10px monospace"; ctx.fillText("GREEN FLAGS", 60, y);
      y += 16;
      results.greenFlags.forEach((f) => {
        ctx.fillStyle = "#6EE7B7"; ctx.font = "400 11px sans-serif"; ctx.fillText("▸ " + f, 70, y);
        y += 16;
      });
    }

    // ════════════════════════════════════════════════════════
    // PAGE 2: AI Assessment + Benchmarks
    // ════════════════════════════════════════════════════════
    if (pdfOptions.aiAssessment || pdfOptions.benchmarks) {
      ctx = newPage();
      y = 80;

      if (pdfOptions.aiAssessment && results.aiInsight) {
        ctx.fillStyle = "#818CF8"; ctx.font = "bold 11px monospace"; ctx.fillText("5. AI DEAL ASSESSMENT", 40, y);
        y += 20;
        ctx.fillStyle = "rgba(99,102,241,0.06)"; ctx.beginPath(); ctx.roundRect(40, y, W - 80, 0, 8); ctx.fill();

        // Word wrap the AI insight
        ctx.fillStyle = "#C4B5FD"; ctx.font = "400 12px sans-serif";
        const words = results.aiInsight.replace(/\*\*/g, "").split(" ");
        let line = "";
        const maxW = W - 120;
        const lineH = 18;
        let startY = y + 16;
        words.forEach((word) => {
          const test = line + word + " ";
          if (ctx.measureText(test).width > maxW && line) {
            ctx.fillText(line.trim(), 60, startY);
            line = word + " ";
            startY += lineH;
          } else { line = test; }
        });
        if (line.trim()) { ctx.fillText(line.trim(), 60, startY); startY += lineH; }
        y = startY + 24;
      }

      if (pdfOptions.benchmarks) {
        ctx.fillStyle = "#818CF8"; ctx.font = "bold 11px monospace"; ctx.fillText("6. INDUSTRY BENCHMARKS", 40, y);
        y += 24;
        ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.beginPath(); ctx.roundRect(40, y, W - 80, 90, 8); ctx.fill();

        const benchItems = [
          ["SDE Margin", results.benchmarks.actualMargin + "%", "Industry: " + results.benchmarks.typicalMargin[0] + "-" + results.benchmarks.typicalMargin[1] + "%"],
          ["Valuation Multiple", results.valuation.multiple.toFixed(2) + "x", "Industry: " + results.benchmarks.typicalMultiple[0] + "-" + results.benchmarks.typicalMultiple[1] + "x"],
          ["Rev/Employee", fmt$(results.benchmarks.revenuePerEmployee), "Industry avg: " + fmt$(results.benchmarks.industryAvgRevenuePerEmployee)],
          ["Labor Ratio", results.benchmarks.laborRatio, "Typical range"],
        ];
        benchItems.forEach((b, i) => {
          const by = y + 20 + i * 18;
          ctx.fillStyle = "#6B7280"; ctx.font = "400 11px sans-serif"; ctx.fillText(b[0], 60, by);
          ctx.fillStyle = "#E2E8F0"; ctx.font = "bold 11px monospace"; ctx.fillText(b[1], 240, by);
          ctx.fillStyle = "#4B5563"; ctx.font = "400 10px sans-serif"; ctx.fillText(b[2], 420, by);
        });
        y += 114;
      }

      // Footer
      ctx.fillStyle = "rgba(255,255,255,0.03)"; ctx.fillRect(0, H - 60, W, 60);
      ctx.fillStyle = "#374151"; ctx.font = "400 10px sans-serif";
      ctx.fillText("Generated by NexTax Deal Intelligence Platform — nextax.ai", 40, H - 30);
      ctx.textAlign = "right";
      ctx.fillText(new Date().toLocaleDateString(), W - 40, H - 30);
      ctx.textAlign = "left";
      ctx.fillStyle = "#374151"; ctx.font = "400 9px sans-serif";
      ctx.fillText("This report is for informational purposes only and does not constitute financial advice.", 40, H - 16);
    }

    // Also add footer to page 1
    const p1ctx = pages[0].getContext("2d")!;
    p1ctx.fillStyle = "rgba(255,255,255,0.03)"; p1ctx.fillRect(0, H - 60, W, 60);
    p1ctx.fillStyle = "#374151"; p1ctx.font = "400 10px sans-serif";
    p1ctx.fillText("Generated by NexTax Deal Intelligence Platform — nextax.ai", 40, H - 30);
    p1ctx.textAlign = "right"; p1ctx.fillText(new Date().toLocaleDateString(), W - 40, H - 30); p1ctx.textAlign = "left";
    p1ctx.fillStyle = "#374151"; p1ctx.font = "400 9px sans-serif";
    p1ctx.fillText("This report is for informational purposes only and does not constitute financial advice.", 40, H - 16);

    // ── Convert canvases to PDF using jsPDF
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [W, H] });

    pages.forEach((pageCanvas, i) => {
      if (i > 0) pdf.addPage([W, H]);
      const imgData = pageCanvas.toDataURL("image/png", 1.0);
      pdf.addImage(imgData, "PNG", 0, 0, W, H);
    });

    const filename = `NexTax-Deal-Memo-${ind?.label?.replace(/\s/g, "-") || "Deal"}-${new Date().toISOString().split("T")[0]}.pdf`;
    pdf.save(filename);

    setPdfExporting(false);
    setShowPdfOptions(false);
  };

  const handleReset = () => { setStep(1); setResults(null); };

  const handleGateSubmit = async () => {
    if (!gateEmail) return;
    setGateLoading(true);
    try {
      await fetch("/api/capture-lead", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: gateName, email: gateEmail, source: "risk-analyzer", industry: "", dealScore: null, metadata: {} }),
      });
    } catch { /* non-blocking */ }
    setGated(false);
    setGateLoading(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "#0B0F17", color: "#E2E8F0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=JetBrains+Mono:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
        * { box-sizing: border-box; }
        select, input { font-family: 'DM Sans', sans-serif; }
        select:focus, input:focus { border-color: rgba(99,102,241,0.5) !important; outline: none; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.4s ease-out forwards; }
        .fade-up-d1 { animation-delay: 0.08s; opacity: 0; }
        .fade-up-d2 { animation-delay: 0.16s; opacity: 0; }
        .fade-up-d3 { animation-delay: 0.24s; opacity: 0; }
        .fade-up-d4 { animation-delay: 0.32s; opacity: 0; }
        .fade-up-d5 { animation-delay: 0.40s; opacity: 0; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "40px 24px 32px", textAlign: "center", background: "radial-gradient(ellipse at center top, rgba(59,130,246,0.06) 0%, transparent 60%)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 20, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", fontSize: 12, color: "#60A5FA", fontWeight: 600, marginBottom: 16 }}>
          🔎 Comprehensive Deal Analysis
        </div>
        <h1 style={{ fontSize: "clamp(26px, 4.5vw, 40px)", fontWeight: 800, margin: "0 0 10px", fontFamily: "'Instrument Serif', serif", background: "linear-gradient(135deg, #F8FAFC 0%, #94A3B8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.15 }}>
          Run a full acquisition risk assessment.
        </h1>
        <p style={{ fontSize: 15, color: "#8896A6", maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
          Evaluate operational, financial, and market risks before signing your LOI. Location-aware analysis with industry benchmarks and AI underwriting.
        </p>
      </div>

      {/* EMAIL GATE */}
      {gated && (
        <div style={{ maxWidth: 440, margin: "0 auto", padding: "0 24px 40px" }}>
          <div className="fade-up" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "32px 28px", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <img src="/nextax-icon.png" alt="NexTax" style={{ width: 64, height: 64, borderRadius: 12 }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px", color: "#E2E8F0", fontFamily: "'Instrument Serif', serif" }}>Get your full risk report.</h2>
            <p style={{ fontSize: 14, color: "#8896A6", margin: "0 0 24px", lineHeight: 1.5 }}>
              Enter your email to begin the comprehensive deal analysis with operational scoring, market intelligence, and AI insights.
            </p>
            <div style={{ textAlign: "left", marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>First Name</label>
              <input type="text" placeholder="Steve" value={gateName} onChange={(e) => setGateName(e.target.value)} style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }} />
            </div>
            <div style={{ textAlign: "left", marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</label>
              <input type="email" placeholder="you@email.com" value={gateEmail} onChange={(e) => setGateEmail(e.target.value)} style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }} />
            </div>
            <button onClick={handleGateSubmit} disabled={!gateEmail || gateLoading} style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: gateEmail ? "linear-gradient(135deg, #3B82F6, #6366F1)" : "rgba(255,255,255,0.08)", color: gateEmail ? "#fff" : "#6B7280", fontSize: 15, fontWeight: 700, cursor: gateEmail ? "pointer" : "not-allowed", fontFamily: "'DM Sans', sans-serif" }}>
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
            {[1, 2, 3].map((s) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                  background: step >= s ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                  border: step >= s ? "1.5px solid rgba(99,102,241,0.4)" : "1.5px solid rgba(255,255,255,0.08)",
                  color: step >= s ? "#818CF8" : "#4B5563",
                }}>{s}</div>
                {s < 3 && <div style={{ width: 32, height: 1.5, background: step > s ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)" }} />}
              </div>
            ))}
          </div>
        )}

        {/* ── STEP 1: Financials ── */}
        {step === 1 && (
          <div className="fade-up" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "24px 24px 16px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px", color: "#E2E8F0" }}>Deal Financials</h2>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px" }}>Core numbers from the CIM or listing.</p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Industry</label>
              <select value={inputs.industry} onChange={(e) => set("industry", e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14 }}>
                <option value="">Select industry...</option>
                {Object.entries(INDUSTRIES).sort((a, b) => a[1].label.localeCompare(b[1].label)).map(([key, ind]) => (
                  <option key={key} value={key}>{ind.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <InputField label="Annual Revenue" value={inputs.revenue} onChange={(v) => setCurrency("revenue", v)} placeholder="500,000" prefix="$" />
              <InputField label="SDE" value={inputs.sde} onChange={(v) => setCurrency("sde", v)} placeholder="150,000" prefix="$" />
            </div>
            <InputField label="Asking Price" value={inputs.askingPrice} onChange={(v) => setCurrency("askingPrice", v)} placeholder="450,000" prefix="$" />

            <div style={{ padding: "14px 18px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 500 }}>Debt Terms</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <InputField label="Debt %" value={inputs.debtPercent} onChange={(v) => set("debtPercent", v.replace(/[^0-9.]/g, ""))} small suffix="%" />
                <InputField label="Rate %" value={inputs.interestRate} onChange={(v) => set("interestRate", v.replace(/[^0-9.]/g, ""))} small suffix="%" />
                <InputField label="Term" value={inputs.loanTermYears} onChange={(v) => set("loanTermYears", v.replace(/[^0-9]/g, ""))} small suffix="yr" />
              </div>
            </div>

            <button onClick={() => setStep(2)} disabled={!canProceedStep1}
              style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: canProceedStep1 ? "linear-gradient(135deg, #6366F1, #8B5CF6)" : "rgba(255,255,255,0.08)", color: canProceedStep1 ? "#fff" : "#6B7280", fontSize: 15, fontWeight: 700, cursor: canProceedStep1 ? "pointer" : "not-allowed", fontFamily: "'DM Sans', sans-serif" }}>
              Next: Location →
            </button>
          </div>
        )}

        {/* ── STEP 2: Location ── */}
        {step === 2 && (
          <div className="fade-up" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "24px 24px 16px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px", color: "#E2E8F0" }}>Location</h2>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px" }}>Optional — improves market risk analysis.</p>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
              <InputField label="City" value={inputs.city} onChange={(v) => set("city", v)} placeholder="Austin" />
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>State</label>
                <select value={inputs.state} onChange={(e) => set("state", e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14 }}>
                  <option value="">Select...</option>
                  {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <InputField label="Zip Code" value={inputs.zipCode} onChange={(v) => set("zipCode", v.replace(/[^0-9]/g, "").slice(0, 5))} placeholder="78701" />

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: "13px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#8896A6", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
              <button onClick={() => setStep(3)} style={{ flex: 2, padding: "13px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Next: Business Profile →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Operational ── */}
        {step === 3 && (
          <div className="fade-up" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "24px 24px 16px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px", color: "#E2E8F0" }}>Business Profile</h2>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px" }}>Operational details for risk scoring.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <InputField label="Years in Business" value={inputs.yearsInBusiness} onChange={(v) => set("yearsInBusiness", v.replace(/[^0-9]/g, ""))} placeholder="8" />
              <InputField label="# of Employees" value={inputs.employeeCount} onChange={(v) => set("employeeCount", v.replace(/[^0-9]/g, ""))} placeholder="12" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Revenue Trend</label>
                <select value={inputs.revenueGrowth} onChange={(e) => set("revenueGrowth", e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14 }}>
                  <option value="growing">Growing</option>
                  <option value="flat">Flat</option>
                  <option value="declining">Declining</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Customer Concentration</label>
                <select value={inputs.customerConcentration} onChange={(e) => set("customerConcentration", e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14 }}>
                  <option value="low">Low (diversified)</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High (top client &gt; 30%)</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#C9D1D9" }}>
                <input type="checkbox" checked={inputs.ownerOperated} onChange={(e) => set("ownerOperated", e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "#6366F1" }} />
                Owner-operated
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#C9D1D9" }}>
                <input type="checkbox" checked={inputs.hasRealEstate} onChange={(e) => set("hasRealEstate", e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "#6366F1" }} />
                Includes real estate
              </label>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: "13px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#8896A6", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
              <button onClick={handleSubmit} disabled={loading}
                style={{ flex: 2, padding: "13px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "wait" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Analyzing Deal..." : "⚡ Run Full Analysis"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: RESULTS ── */}
        {step === 4 && results && (
          <div ref={resultsRef}>
            {/* Score Hero */}
            <div className="fade-up" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "28px 24px", marginBottom: 14, textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                <ScoreRing score={results.overall} size={150} strokeWidth={9} />
              </div>
              <div style={{ display: "inline-block", padding: "5px 18px", borderRadius: 20, background: getRiskBg(results.riskLevel), fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 14 }}>
                {results.riskLevel} Risk
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
                {[
                  { label: "Multiple", value: results.valuation.multiple.toFixed(2) + "x" },
                  { label: "DSCR", value: results.debtRisk.dscr.toFixed(2) },
                  { label: "Monthly Debt", value: formatCurrency(results.debtRisk.monthlyPayment) },
                  { label: "Fair Value", value: formatCurrency(results.valuation.fairValueEstimate) },
                ].map((item) => (
                  <div key={item.label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>{item.value}</div>
                    <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="fade-up fade-up-d1" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px 22px", marginBottom: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", margin: "0 0 14px" }}>Risk Scores</h3>
              <SubScoreBar label="Valuation" score={results.valuation.score} icon="⚖️" />
              <SubScoreBar label="Debt Risk" score={results.debtRisk.score} icon="🏦" />
              <SubScoreBar label="Market Risk" score={results.marketRisk.score} icon="📈" />
              <SubScoreBar label="Industry Risk" score={results.industryRisk.score} icon="🏭" />
              <SubScoreBar label="Operational Risk" score={results.operationalRisk.score} icon="⚙️" />
            </div>

            {/* Red/Green Flags */}
            {(results.redFlags.length > 0 || results.greenFlags.length > 0) && (
              <div className="fade-up fade-up-d2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                {results.redFlags.length > 0 && (
                  <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 11, color: "#EF4444", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>🚩 Red Flags</div>
                    {results.redFlags.map((f, i) => (
                      <div key={i} style={{ fontSize: 12, color: "#FCA5A5", lineHeight: 1.5, marginBottom: 4, paddingLeft: 10, borderLeft: "2px solid rgba(239,68,68,0.2)" }}>{f}</div>
                    ))}
                  </div>
                )}
                {results.greenFlags.length > 0 && (
                  <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)", borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 11, color: "#10B981", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>✅ Green Flags</div>
                    {results.greenFlags.map((f, i) => (
                      <div key={i} style={{ fontSize: 12, color: "#6EE7B7", lineHeight: 1.5, marginBottom: 4, paddingLeft: 10, borderLeft: "2px solid rgba(16,185,129,0.2)" }}>{f}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Detail Cards */}
            <div className="fade-up fade-up-d3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <SectionCard title="Valuation" icon="⚖️" accentColor={getScoreColor(results.valuation.score)}>
                <p style={{ fontSize: 13, color: "#C9D1D9", lineHeight: 1.5, margin: "0 0 6px" }}>{results.valuation.verdict}</p>
                <div style={{ fontSize: 11, color: "#6B7280" }}>Market range: {results.valuation.marketRange[0]}–{results.valuation.marketRange[1]}x SDE</div>
                <div style={{ fontSize: 11, color: "#6B7280" }}>Fair value estimate: {formatCurrency(results.valuation.fairValueEstimate)}</div>
                {results.valuation.flags.map((f, i) => <div key={i} style={{ fontSize: 11, color: "#F59E0B", marginTop: 4 }}>⚠ {f}</div>)}
              </SectionCard>
              <SectionCard title="Debt Service" icon="🏦" accentColor={getScoreColor(results.debtRisk.score)}>
                <p style={{ fontSize: 13, color: "#C9D1D9", lineHeight: 1.5, margin: "0 0 6px" }}>{results.debtRisk.verdict}</p>
                <div style={{ fontSize: 11, color: "#6B7280" }}>Loan: {formatCurrency(results.debtRisk.loanAmount)} | Down: {formatCurrency(results.debtRisk.downPayment)}</div>
                <div style={{ fontSize: 11, color: "#6B7280" }}>Annual payment: {formatCurrency(results.debtRisk.annualPayment)}</div>
                {results.debtRisk.breakEvenMonths > 0 && <div style={{ fontSize: 11, color: "#6B7280" }}>Down payment recovery: ~{results.debtRisk.breakEvenMonths} months</div>}
                {results.debtRisk.flags.map((f, i) => <div key={i} style={{ fontSize: 11, color: "#F59E0B", marginTop: 4 }}>⚠ {f}</div>)}
              </SectionCard>
              <SectionCard title="Market Risk" icon="📈" accentColor={getScoreColor(results.marketRisk.score)}>
                <p style={{ fontSize: 13, color: "#C9D1D9", lineHeight: 1.5, margin: "0 0 6px" }}>{results.marketRisk.verdict}</p>
                <div style={{ fontSize: 11, color: "#6B7280" }}>Growth: {results.marketRisk.industryGrowth} | Saturation: {results.marketRisk.saturationLevel}</div>
                {results.marketRisk.flags.map((f, i) => <div key={i} style={{ fontSize: 11, color: "#8896A6", marginTop: 4 }}>ℹ {f}</div>)}
              </SectionCard>
              <SectionCard title="Operational" icon="⚙️" accentColor={getScoreColor(results.operationalRisk.score)}>
                <p style={{ fontSize: 13, color: "#C9D1D9", lineHeight: 1.5, margin: "0 0 6px" }}>{results.operationalRisk.verdict}</p>
                {results.operationalRisk.flags.map((f, i) => <div key={i} style={{ fontSize: 11, color: "#F59E0B", marginTop: 4 }}>⚠ {f}</div>)}
              </SectionCard>
            </div>

            {/* Benchmarks */}
            <div className="fade-up fade-up-d4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px 22px", marginBottom: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}>📊 Industry Benchmarks</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  { label: "SDE Margin", yours: results.benchmarks.actualMargin + "%", benchmark: results.benchmarks.typicalMargin[0] + "–" + results.benchmarks.typicalMargin[1] + "%", good: results.benchmarks.actualMargin >= results.benchmarks.typicalMargin[0] },
                  { label: "Multiple", yours: results.valuation.multiple.toFixed(2) + "x", benchmark: results.benchmarks.typicalMultiple[0] + "–" + results.benchmarks.typicalMultiple[1] + "x", good: results.valuation.multiple <= results.benchmarks.typicalMultiple[1] },
                  { label: "Rev/Employee", yours: formatCurrency(results.benchmarks.revenuePerEmployee), benchmark: formatCurrency(results.benchmarks.industryAvgRevenuePerEmployee), good: results.benchmarks.revenuePerEmployee >= results.benchmarks.industryAvgRevenuePerEmployee * 0.8 },
                ].map((b) => (
                  <div key={b.label} style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", marginBottom: 6 }}>{b.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: b.good ? "#10B981" : "#F59E0B", fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>{b.yours}</div>
                    <div style={{ fontSize: 10, color: "#6B7280" }}>Industry: {b.benchmark}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: "#6B7280" }}>
                Typical labor ratio: {results.benchmarks.laborRatio}
              </div>
            </div>

            {/* AI Insight */}
            <div className="fade-up fade-up-d5" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 14, padding: "18px 22px", marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#818CF8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                🤖 AI Deal Assessment
              </div>
              {aiLoading ? (
                <div style={{ fontSize: 13, color: "#A5B4FC", fontStyle: "italic" }}>Analyzing deal across all risk dimensions...</div>
              ) : results.aiInsight ? (
                <p style={{ margin: 0, fontSize: 14, color: "#C4B5FD", lineHeight: 1.7 }}>{renderMarkdown(results.aiInsight)}</p>
              ) : null}
            </div>

            {/* THREE-LENS DATA SOURCES + CONFIDENCE */}
            {results.threeLens && (
              <div className="fade-up fade-up-d5" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(99,102,241,0.06) 100%)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 14, padding: "20px 22px", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ padding: "3px 10px", borderRadius: 6, background: results.threeLens.confidence.overall === "HIGH" ? "rgba(16,185,129,0.15)" : results.threeLens.confidence.overall === "MEDIUM" ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)", border: `1px solid ${results.threeLens.confidence.overall === "HIGH" ? "rgba(16,185,129,0.25)" : results.threeLens.confidence.overall === "MEDIUM" ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.25)"}`, fontSize: 11, fontWeight: 700, color: results.threeLens.confidence.overall === "HIGH" ? "#10B981" : results.threeLens.confidence.overall === "MEDIUM" ? "#F59E0B" : "#EF4444" }}>
                    CONFIDENCE: {results.threeLens.confidence.overall}
                  </div>
                  <span style={{ fontSize: 12, color: "#8896A6" }}>Three-lens intelligence</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                  {[
                    { icon: "📊", label: "Listings", ...results.threeLens.confidence.listing },
                    { icon: "💰", label: "Transactions", ...results.threeLens.confidence.transaction },
                    { icon: "🏦", label: "Financial", ...results.threeLens.confidence.financial },
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
                    <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>{(results.threeLens.transaction.saleToAskRatio * 100).toFixed(0)}%</div>
                      <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase" }}>Sale-to-Ask</div>
                    </div>
                    <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>{results.threeLens.transaction.daysOnMarket}</div>
                      <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase" }}>Days on Market</div>
                    </div>
                    <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>{results.threeLens.transaction.reportedSales.toLocaleString()}</div>
                      <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase" }}>Closed Sales</div>
                    </div>
                  </div>
                )}
                {results.threeLens.transaction && (
                  <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>
                    {results.threeLens.sellerBuyerGap !== null && results.threeLens.sellerBuyerGap > 5
                      ? `Based on ${results.threeLens.transaction.reportedSales.toLocaleString()} closed ${results.threeLens.transaction.subsector} transactions, sellers typically overask by ${results.threeLens.sellerBuyerGap.toFixed(0)}%. The median sold price is ${formatCurrency(results.threeLens.transaction.medianSalePrice)} at ${results.threeLens.transaction.cashflowMultiple.toFixed(2)}x cash flow.`
                      : `Based on ${results.threeLens.transaction.reportedSales.toLocaleString()} closed ${results.threeLens.transaction.subsector} transactions, the median sold multiple is ${results.threeLens.transaction.cashflowMultiple.toFixed(2)}x with ${results.threeLens.transaction.daysOnMarket} median days on market.`
                    }
                  </div>
                )}
              </div>
            )}

            {/* PDF Export */}
            <div className="fade-up fade-up-d5" style={{ marginBottom: 14 }}>
              <button onClick={() => setShowPdfOptions(!showPdfOptions)} style={{ width: "100%", padding: "13px 20px", borderRadius: 10, border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.08)", color: "#34D399", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                📄 Download Deal Memo
              </button>
              {showPdfOptions && (
                <div className="fade-up" style={{ marginTop: 10, padding: "16px 20px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", marginBottom: 12 }}>Customize your report:</div>
                  {[
                    { key: "aiAssessment", label: "Include AI Assessment" },
                    { key: "benchmarks", label: "Include Industry Benchmarks" },
                    { key: "industryComparison", label: "Include Market Comparison" },
                  ].map((opt) => (
                    <label key={opt.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer", fontSize: 13, color: "#C9D1D9" }}>
                      <input type="checkbox" checked={pdfOptions[opt.key as keyof typeof pdfOptions]}
                        onChange={(e) => setPdfOptions((p) => ({ ...p, [opt.key]: e.target.checked }))}
                        style={{ width: 16, height: 16, accentColor: "#10B981" }} />
                      {opt.label}
                    </label>
                  ))}
                  <button onClick={generateDealMemoPDF} disabled={pdfExporting}
                    style={{ width: "100%", marginTop: 8, padding: "11px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #10B981, #059669)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: pdfExporting ? "wait" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: pdfExporting ? 0.7 : 1 }}>
                    {pdfExporting ? "Generating..." : "📄 Generate Deal Memo"}
                  </button>
                </div>
              )}
            </div>

            {/* CTAs */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href="https://nextax.ai/acquisitions" style={{ flex: 2, padding: "13px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "#fff", fontSize: 14, fontWeight: 700, textAlign: "center", textDecoration: "none", display: "block", minWidth: 180, fontFamily: "'DM Sans', sans-serif" }}>
                🔍 Run Full NexTax Underwriting
              </a>
              <button onClick={handleReset} style={{ flex: 1, padding: "13px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#8896A6", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                ↺ Analyze Another Deal
              </button>
            </div>
            <p style={{ fontSize: 11, color: "#4B5563", marginTop: 16, lineHeight: 1.5, textAlign: "center" }}>
              This tool provides estimates based on industry averages and standard financial calculations. It is not financial advice. Consult qualified professionals before making acquisition decisions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
