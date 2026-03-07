"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface DealInputs {
  revenue: string;
  sde: string;
  askingPrice: string;
  industry: string;
  debtPercent: string;
  interestRate: string;
  loanTermYears: string;
}

interface ScoreBreakdown {
  overall: number;
  valuation: { score: number; multiple: number; marketRange: [number, number]; verdict: string };
  debtRisk: { score: number; dscr: number; annualPayment: number; monthlyPayment: number; verdict: string };
  marketRisk: { score: number; industryGrowth: string; verdict: string };
  industryRisk: { score: number; marginRange: [number, number]; verdict: string };
  riskLevel: "Low" | "Moderate" | "High" | "Critical";
  aiInsight: string | null;
}

// ─── INDUSTRY DATA ───────────────────────────────────────────────────────────

const INDUSTRIES: Record<string, {
  label: string;
  typicalMultiple: [number, number];
  marginRange: [number, number];
  growth: string;
  riskFactor: number;
}> = {
  laundromat: { label: "Laundromat", typicalMultiple: [2.5, 4.0], marginRange: [25, 40], growth: "Stable", riskFactor: 0.85 },
  hvac: { label: "HVAC", typicalMultiple: [2.5, 4.5], marginRange: [15, 30], growth: "Growing", riskFactor: 0.75 },
  landscaping: { label: "Landscaping", typicalMultiple: [1.5, 3.0], marginRange: [10, 25], growth: "Stable", riskFactor: 0.90 },
  carwash: { label: "Car Wash", typicalMultiple: [3.0, 5.0], marginRange: [25, 45], growth: "Growing", riskFactor: 0.80 },
  dental: { label: "Dental Practice", typicalMultiple: [3.0, 5.5], marginRange: [20, 40], growth: "Growing", riskFactor: 0.65 },
  gym: { label: "Gym / Fitness Center", typicalMultiple: [2.0, 4.0], marginRange: [15, 35], growth: "Stable", riskFactor: 0.95 },
  restaurant: { label: "Restaurant", typicalMultiple: [1.5, 3.0], marginRange: [5, 15], growth: "Volatile", riskFactor: 1.10 },
  autorepair: { label: "Auto Repair", typicalMultiple: [2.0, 3.5], marginRange: [15, 30], growth: "Stable", riskFactor: 0.85 },
  cleaning: { label: "Cleaning Service", typicalMultiple: [1.5, 3.0], marginRange: [15, 30], growth: "Growing", riskFactor: 0.80 },
  ecommerce: { label: "Ecommerce Brand", typicalMultiple: [2.5, 4.5], marginRange: [15, 35], growth: "Variable", riskFactor: 0.95 },
  saas: { label: "SaaS Product", typicalMultiple: [3.0, 6.0], marginRange: [60, 85], growth: "Growing", riskFactor: 0.70 },
  insurance: { label: "Insurance Agency", typicalMultiple: [2.0, 3.5], marginRange: [20, 40], growth: "Stable", riskFactor: 0.70 },
  plumbing: { label: "Plumbing", typicalMultiple: [2.0, 4.0], marginRange: [15, 30], growth: "Growing", riskFactor: 0.75 },
  roofing: { label: "Roofing", typicalMultiple: [1.5, 3.5], marginRange: [15, 30], growth: "Stable", riskFactor: 0.90 },
  petcare: { label: "Pet Care / Grooming", typicalMultiple: [2.0, 4.0], marginRange: [20, 40], growth: "Growing", riskFactor: 0.80 },
};

// ─── SCORING ENGINE ──────────────────────────────────────────────────────────

function calculateScores(inputs: DealInputs): ScoreBreakdown | null {
  const revenue = parseFloat(inputs.revenue.replace(/,/g, ""));
  const sde = parseFloat(inputs.sde.replace(/,/g, ""));
  const price = parseFloat(inputs.askingPrice.replace(/,/g, ""));
  const debtPct = parseFloat(inputs.debtPercent) / 100;
  const rate = parseFloat(inputs.interestRate) / 100;
  const term = parseFloat(inputs.loanTermYears);
  const industry = INDUSTRIES[inputs.industry];

  if (!revenue || !sde || !price || !industry || isNaN(debtPct) || isNaN(rate) || isNaN(term)) return null;

  // Valuation
  const multiple = price / sde;
  const [lowMult, highMult] = industry.typicalMultiple;
  const midMult = (lowMult + highMult) / 2;
  let valuationScore: number;
  if (multiple <= midMult) {
    valuationScore = Math.min(95, 70 + (midMult - multiple) / midMult * 50);
  } else if (multiple <= highMult) {
    valuationScore = 70 - ((multiple - midMult) / (highMult - midMult)) * 30;
  } else {
    valuationScore = Math.max(10, 40 - ((multiple - highMult) / highMult) * 60);
  }
  valuationScore = Math.round(Math.max(5, Math.min(98, valuationScore)));

  const valuationVerdict = multiple <= lowMult
    ? "Below market — strong negotiating position"
    : multiple <= midMult
    ? "Fair value — within typical range"
    : multiple <= highMult
    ? "At the upper end of market range"
    : "Above market — you may be overpaying";

  // Debt / DSCR
  const loanAmount = price * debtPct;
  const monthlyRate = rate / 12;
  const numPayments = term * 12;
  const monthlyPayment = monthlyRate > 0
    ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
    : loanAmount / numPayments;
  const annualPayment = monthlyPayment * 12;
  const dscr = annualPayment > 0 ? sde / annualPayment : 99;

  let debtScore: number;
  if (dscr >= 2.0) debtScore = 90;
  else if (dscr >= 1.5) debtScore = 75 + (dscr - 1.5) * 30;
  else if (dscr >= 1.25) debtScore = 55 + (dscr - 1.25) * 80;
  else if (dscr >= 1.0) debtScore = 30 + (dscr - 1.0) * 100;
  else debtScore = Math.max(5, dscr * 30);
  debtScore = Math.round(Math.max(5, Math.min(98, debtScore)));

  const debtVerdict = dscr >= 1.5
    ? "Healthy debt coverage — comfortable margin"
    : dscr >= 1.25
    ? "Acceptable — meets most lender minimums"
    : dscr >= 1.0
    ? "Tight — minimal margin for error"
    : "Insufficient — cash flow doesn't cover debt";

  // Market risk (simplified — uses industry growth proxy)
  const growthScores: Record<string, number> = { Growing: 80, Stable: 65, Variable: 45, Volatile: 30 };
  const marketScore = growthScores[industry.growth] || 50;
  const marketVerdict = marketScore >= 70
    ? "Favorable market conditions for this industry"
    : marketScore >= 50
    ? "Stable market — predictable demand"
    : "Volatile market — higher operational risk";

  // Industry risk
  const industryScore = Math.round(Math.max(15, Math.min(95, (1 - industry.riskFactor) * 100 + 40)));
  const industryVerdict = industryScore >= 70
    ? "Lower-risk industry with strong fundamentals"
    : industryScore >= 45
    ? "Moderate industry risk — standard for this sector"
    : "Higher-risk industry — requires experienced operator";

  // Margin check
  const sdeMargin = (sde / revenue) * 100;
  const [lowMargin, highMargin] = industry.marginRange;
  const marginMid = (lowMargin + highMargin) / 2;
  let marginAdjust = 0;
  if (sdeMargin < lowMargin) marginAdjust = -10;
  else if (sdeMargin > highMargin) marginAdjust = 5;

  // Overall
  const overall = Math.round(
    Math.max(5, Math.min(98,
      valuationScore * 0.30 +
      debtScore * 0.30 +
      marketScore * 0.20 +
      industryScore * 0.20 +
      marginAdjust
    ))
  );

  const riskLevel: ScoreBreakdown["riskLevel"] = overall >= 70 ? "Low" : overall >= 50 ? "Moderate" : overall >= 30 ? "High" : "Critical";

  return {
    overall,
    valuation: { score: valuationScore, multiple, marketRange: [lowMult, highMult], verdict: valuationVerdict },
    debtRisk: { score: debtScore, dscr, annualPayment, monthlyPayment, verdict: debtVerdict },
    marketRisk: { score: marketScore, industryGrowth: industry.growth, verdict: marketVerdict },
    industryRisk: { score: industryScore, marginRange: industry.marginRange, verdict: industryVerdict },
    riskLevel,
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

function getRiskGradient(level: string): string {
  switch (level) {
    case "Low": return "linear-gradient(135deg, #065F46 0%, #10B981 100%)";
    case "Moderate": return "linear-gradient(135deg, #92400E 0%, #F59E0B 100%)";
    case "High": return "linear-gradient(135deg, #9A3412 0%, #F97316 100%)";
    case "Critical": return "linear-gradient(135deg, #991B1B 0%, #EF4444 100%)";
    default: return "linear-gradient(135deg, #374151 0%, #6B7280 100%)";
  }
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
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: size * 0.3, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ fontSize: 10, color: "#8896A6", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>
          Deal Score
        </span>
      </div>
    </div>
  );
}

function SubScoreBar({ label, score, icon }: { label: string; score: number; icon: string }) {
  const color = getScoreColor(score);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: "#C9D1D9", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
          <span>{icon}</span> {label}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{score}</span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${score}%`, background: color, borderRadius: 3,
          transition: "width 1s ease-out",
        }} />
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function DealRealityCheck() {
  const [inputs, setInputs] = useState<DealInputs>({
    revenue: "",
    sde: "",
    askingPrice: "",
    industry: "",
    debtPercent: "80",
    interestRate: "10.5",
    loanTermYears: "10",
  });
  const [results, setResults] = useState<ScoreBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleChange = (field: keyof DealInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleCurrencyInput = (field: keyof DealInputs, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    handleChange(field, cleaned ? parseInt(cleaned).toLocaleString() : "");
  };

  const handleSubmit = async () => {
    setLoading(true);
    setShowResults(false);

    // Small delay for UX
    await new Promise((r) => setTimeout(r, 600));

    const scores = calculateScores(inputs);
    if (scores) {
      setResults(scores);
      setShowResults(true);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);

      // Fire AI analysis in background
      fetchAIInsight(scores);
    }
    setLoading(false);
  };

  const fetchAIInsight = async (scores: ScoreBreakdown) => {
    setAiLoading(true);
    const industry = INDUSTRIES[inputs.industry];
    try {
      const response = await fetch("/api/deal-reality-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `You are an expert M&A advisor for small business acquisitions. A potential buyer is evaluating a deal with these parameters:

Industry: ${industry?.label}
Annual Revenue: $${inputs.revenue}
Seller's Discretionary Earnings (SDE): $${inputs.sde}
Asking Price: $${inputs.askingPrice}
Valuation Multiple: ${scores.valuation.multiple.toFixed(2)}x SDE
Typical Industry Multiple Range: ${scores.valuation.marketRange[0]}-${scores.valuation.marketRange[1]}x
SDE Margin: ${((parseFloat(inputs.sde.replace(/,/g, "")) / parseFloat(inputs.revenue.replace(/,/g, ""))) * 100).toFixed(1)}%
Debt Service Coverage Ratio (DSCR): ${scores.debtRisk.dscr.toFixed(2)}
Annual Debt Payment: $${Math.round(scores.debtRisk.annualPayment).toLocaleString()}
Debt: ${inputs.debtPercent}% at ${inputs.interestRate}% over ${inputs.loanTermYears} years
Deal Health Score: ${scores.overall}/100 (${scores.riskLevel} Risk)

Provide a brief (3-4 sentence) deal assessment. Be direct and specific. Identify the single biggest risk and the single biggest opportunity. If the deal is poor, say so clearly. If it's strong, explain why. End with one specific negotiation recommendation.`,
          }],
        }),
      });

      const data = await response.json();
      const insight = data.content?.map((b: { type: string; text?: string }) => (b.type === "text" ? b.text : "")).join("") || null;
      setResults((prev) => prev ? { ...prev, aiInsight: insight } : prev);
    } catch {
      setResults((prev) => prev ? {
        ...prev,
        aiInsight: `This ${industry?.label.toLowerCase()} deal at ${scores.valuation.multiple.toFixed(1)}x SDE ${scores.valuation.multiple > scores.valuation.marketRange[1] ? "exceeds" : "falls within"} market multiples. With a DSCR of ${scores.debtRisk.dscr.toFixed(2)}, ${scores.debtRisk.dscr >= 1.25 ? "debt service appears manageable" : "debt coverage is a concern"}. ${scores.overall >= 60 ? "The fundamentals support further diligence" : "Significant risks warrant careful evaluation before proceeding"}.`,
      } : prev);
    }
    setAiLoading(false);
  };

  const handleShare = () => {
    if (!results) return;
    const text = `I just ran a Deal Reality Check on a ${INDUSTRIES[inputs.industry]?.label} acquisition and got a ${results.overall}/100 Deal Health Score (${results.riskLevel} Risk). Free tool at nextax.ai/deal-reality-check`;
    if (navigator.share) {
      navigator.share({ title: "Deal Reality Check — NexTax", text, url: "https://nextax.ai/deal-reality-check" });
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  const isValid = inputs.revenue && inputs.sde && inputs.askingPrice && inputs.industry && inputs.debtPercent && inputs.interestRate && inputs.loanTermYears;

  return (
    <div className="min-h-screen" style={{ background: "#0B0F17", color: "#E2E8F0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=JetBrains+Mono:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
        * { box-sizing: border-box; }
        input[type=text], input[type=number], select {
          font-family: 'DM Sans', sans-serif;
        }
        input[type=text]:focus, input[type=number]:focus, select:focus {
          border-color: rgba(99,102,241,0.5) !important;
          outline: none;
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.15); }
          50% { box-shadow: 0 0 40px rgba(99,102,241,0.3); }
        }
        .result-card { animation: fadeSlideUp 0.5s ease-out forwards; }
        .result-card:nth-child(2) { animation-delay: 0.1s; }
        .result-card:nth-child(3) { animation-delay: 0.2s; }
        .result-card:nth-child(4) { animation-delay: 0.3s; }
      `}</style>

      {/* Hero Section */}
      <div style={{
        padding: "48px 24px 40px",
        textAlign: "center",
        background: "radial-gradient(ellipse at center top, rgba(99,102,241,0.08) 0%, transparent 60%)",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 16px", borderRadius: 20,
          background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
          fontSize: 12, color: "#818CF8", fontWeight: 500, marginBottom: 20,
        }}>
          ⚡ Free Acquisition Analysis Tool
        </div>
        <h1 style={{
          fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 800, margin: "0 0 12px",
          fontFamily: "'Instrument Serif', serif",
          background: "linear-gradient(135deg, #F8FAFC 0%, #94A3B8 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          lineHeight: 1.15,
        }}>
          Deal Reality Check
        </h1>
        <p style={{
          fontSize: 16, color: "#8896A6", maxWidth: 540, margin: "0 auto", lineHeight: 1.6,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Enter your deal numbers and get an instant health score with AI-powered risk analysis. Know if your deal makes sense before you sign the LOI.
        </p>
      </div>

      {/* Input Form */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px 40px" }}>
        <div style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16, padding: "28px 28px 20px",
        }}>
          {/* Industry */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#8896A6", marginBottom: 6, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Industry
            </label>
            <select
              value={inputs.industry}
              onChange={(e) => handleChange("industry", e.target.value)}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 15,
              }}
            >
              <option value="">Select industry...</option>
              {Object.entries(INDUSTRIES).map(([key, ind]) => (
                <option key={key} value={key}>{ind.label}</option>
              ))}
            </select>
          </div>

          {/* Revenue + SDE */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#8896A6", marginBottom: 6, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Annual Revenue
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6B7280", fontSize: 15 }}>$</span>
                <input
                  type="text" placeholder="500,000"
                  value={inputs.revenue}
                  onChange={(e) => handleCurrencyInput("revenue", e.target.value)}
                  style={{
                    width: "100%", padding: "12px 14px 12px 28px", borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 15,
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#8896A6", marginBottom: 6, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                SDE (Seller Discretionary Earnings)
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6B7280", fontSize: 15 }}>$</span>
                <input
                  type="text" placeholder="150,000"
                  value={inputs.sde}
                  onChange={(e) => handleCurrencyInput("sde", e.target.value)}
                  style={{
                    width: "100%", padding: "12px 14px 12px 28px", borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 15,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Asking Price */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "#8896A6", marginBottom: 6, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Asking Price
            </label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6B7280", fontSize: 15 }}>$</span>
              <input
                type="text" placeholder="450,000"
                value={inputs.askingPrice}
                onChange={(e) => handleCurrencyInput("askingPrice", e.target.value)}
                style={{
                  width: "100%", padding: "12px 14px 12px 28px", borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 15,
                }}
              />
            </div>
          </div>

          {/* Debt Terms */}
          <div style={{
            padding: "16px 20px", borderRadius: 10,
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
            marginBottom: 24,
          }}>
            <div style={{ fontSize: 12, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, fontWeight: 500 }}>
              Debt Terms
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 4 }}>Debt %</label>
                <input
                  type="text"
                  value={inputs.debtPercent}
                  onChange={(e) => handleChange("debtPercent", e.target.value.replace(/[^0-9.]/g, ""))}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)", color: "#E2E8F0", fontSize: 14,
                    textAlign: "center",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 4 }}>Interest Rate %</label>
                <input
                  type="text"
                  value={inputs.interestRate}
                  onChange={(e) => handleChange("interestRate", e.target.value.replace(/[^0-9.]/g, ""))}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)", color: "#E2E8F0", fontSize: 14,
                    textAlign: "center",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 4 }}>Term (Years)</label>
                <input
                  type="text"
                  value={inputs.loanTermYears}
                  onChange={(e) => handleChange("loanTermYears", e.target.value.replace(/[^0-9]/g, ""))}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)", color: "#E2E8F0", fontSize: 14,
                    textAlign: "center",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            style={{
              width: "100%", padding: "14px 24px", borderRadius: 12, border: "none",
              background: isValid && !loading
                ? "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)"
                : "rgba(255,255,255,0.08)",
              color: isValid ? "#fff" : "#6B7280",
              fontSize: 16, fontWeight: 700, cursor: isValid && !loading ? "pointer" : "not-allowed",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.3s",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Analyzing Deal..." : "⚡ Check My Deal"}
          </button>
        </div>
      </div>

      {/* Results */}
      {showResults && results && (
        <div ref={resultsRef} style={{
          maxWidth: 680, margin: "0 auto", padding: "0 24px 60px",
        }}>
          {/* Overall Score Hero */}
          <div className="result-card" style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16, padding: "32px 28px", marginBottom: 16,
            textAlign: "center",
            animation: "pulse-glow 3s ease-in-out infinite",
          }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <ScoreRing score={results.overall} size={160} strokeWidth={10} />
            </div>
            <div style={{
              display: "inline-block", padding: "6px 20px", borderRadius: 20,
              background: getRiskGradient(results.riskLevel),
              fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12,
            }}>
              {results.riskLevel} Risk
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap", marginTop: 8 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>
                  {results.valuation.multiple.toFixed(2)}x
                </div>
                <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase" }}>Multiple</div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.08)", alignSelf: "stretch" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>
                  {results.debtRisk.dscr.toFixed(2)}
                </div>
                <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase" }}>DSCR</div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.08)", alignSelf: "stretch" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatCurrency(results.debtRisk.monthlyPayment)}
                </div>
                <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase" }}>Monthly Debt</div>
              </div>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="result-card" style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16, padding: "24px 28px", marginBottom: 16,
            opacity: 0,
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8", marginBottom: 16, margin: "0 0 16px" }}>
              Score Breakdown
            </h3>
            <SubScoreBar label="Valuation" score={results.valuation.score} icon="⚖️" />
            <SubScoreBar label="Debt Risk" score={results.debtRisk.score} icon="🏦" />
            <SubScoreBar label="Market Risk" score={results.marketRisk.score} icon="📈" />
            <SubScoreBar label="Industry Risk" score={results.industryRisk.score} icon="🏭" />
          </div>

          {/* Detail Cards */}
          <div className="result-card" style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16,
            opacity: 0,
          }}>
            <div style={{
              background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12, padding: 16,
            }}>
              <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", marginBottom: 6 }}>Valuation</div>
              <div style={{ fontSize: 13, color: "#C9D1D9", lineHeight: 1.5, marginBottom: 8 }}>
                {results.valuation.verdict}
              </div>
              <div style={{ fontSize: 11, color: "#6B7280" }}>
                Market range: {results.valuation.marketRange[0]}–{results.valuation.marketRange[1]}x SDE
              </div>
            </div>
            <div style={{
              background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12, padding: 16,
            }}>
              <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", marginBottom: 6 }}>Debt Service</div>
              <div style={{ fontSize: 13, color: "#C9D1D9", lineHeight: 1.5, marginBottom: 8 }}>
                {results.debtRisk.verdict}
              </div>
              <div style={{ fontSize: 11, color: "#6B7280" }}>
                Annual payment: {formatCurrency(results.debtRisk.annualPayment)}
              </div>
            </div>
            <div style={{
              background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12, padding: 16,
            }}>
              <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", marginBottom: 6 }}>Market Outlook</div>
              <div style={{ fontSize: 13, color: "#C9D1D9", lineHeight: 1.5, marginBottom: 8 }}>
                {results.marketRisk.verdict}
              </div>
              <div style={{ fontSize: 11, color: "#6B7280" }}>
                Growth outlook: {results.marketRisk.industryGrowth}
              </div>
            </div>
            <div style={{
              background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12, padding: 16,
            }}>
              <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", marginBottom: 6 }}>Industry Profile</div>
              <div style={{ fontSize: 13, color: "#C9D1D9", lineHeight: 1.5, marginBottom: 8 }}>
                {results.industryRisk.verdict}
              </div>
              <div style={{ fontSize: 11, color: "#6B7280" }}>
                Typical SDE margins: {results.industryRisk.marginRange[0]}–{results.industryRisk.marginRange[1]}%
              </div>
            </div>
          </div>

          {/* AI Insight */}
          <div className="result-card" style={{
            background: "rgba(99,102,241,0.06)",
            border: "1px solid rgba(99,102,241,0.15)",
            borderRadius: 16, padding: "20px 24px", marginBottom: 16,
            opacity: 0,
          }}>
            <div style={{
              fontSize: 11, color: "#818CF8", textTransform: "uppercase",
              letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              🤖 AI Deal Assessment
            </div>
            {aiLoading ? (
              <div style={{ fontSize: 13, color: "#A5B4FC", fontStyle: "italic" }}>
                Analyzing deal fundamentals...
              </div>
            ) : results.aiInsight ? (
              <p style={{ margin: 0, fontSize: 14, color: "#C4B5FD", lineHeight: 1.65 }}>
                {results.aiInsight}
              </p>
            ) : null}
          </div>

          {/* CTA + Share */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a
              href="https://nextax.ai/acquisitions"
              style={{
                flex: 1, padding: "14px 24px", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
                color: "#fff", fontSize: 14, fontWeight: 700, textAlign: "center",
                textDecoration: "none", display: "block", minWidth: 200,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              🔍 Run Full NexTax Underwriting
            </a>
            <button
              onClick={handleShare}
              style={{
                padding: "14px 24px", borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "#C9D1D9", fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              📤 Share Deal Score
            </button>
          </div>

          {/* Disclaimer */}
          <p style={{
            fontSize: 11, color: "#4B5563", marginTop: 20, lineHeight: 1.5, textAlign: "center",
          }}>
            This tool provides estimates based on industry averages and standard financial calculations.
            It is not financial advice. Consult qualified professionals before making acquisition decisions.
          </p>
        </div>
      )}

      {/* Bottom trust bar */}
      {!showResults && (
        <div style={{
          textAlign: "center", padding: "24px", borderTop: "1px solid rgba(255,255,255,0.04)",
        }}>
          <div style={{ fontSize: 12, color: "#4B5563", marginBottom: 8 }}>
            Trusted by acquisition entrepreneurs evaluating real deals
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#374151" }}>✓ No signup required</span>
            <span style={{ fontSize: 11, color: "#374151" }}>✓ Instant results</span>
            <span style={{ fontSize: 11, color: "#374151" }}>✓ AI-powered analysis</span>
            <span style={{ fontSize: 11, color: "#374151" }}>✓ 15 industries covered</span>
          </div>
        </div>
      )}
    </div>
  );
}
