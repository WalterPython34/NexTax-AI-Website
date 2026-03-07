"use client";

import React, { useState, useCallback, useRef } from "react";

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
  valuation: { score: number; multiple: number; marketRange: [number, number]; fairValue: number; recommendedOffer: [number, number]; verdict: string };
  debtRisk: { score: number; dscr: number; annualPayment: number; monthlyPayment: number; verdict: string };
  marketRisk: { score: number; industryGrowth: string; verdict: string };
  industryRisk: { score: number; marginRange: [number, number]; verdict: string };
  marketIntel: { demandLevel: string; buyerInterestRank: number; competitionLevel: string; demandScore: number };
  communityComparison: { avgScore: number; topScore: number; lowestScore: number; percentile: number; totalDeals: number };
  redFlags: string[];
  greenFlags: string[];
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
  demandScore: number;
  buyerInterestRank: number;
  competitionLevel: string;
}> = {
  laundromat: { label: "Laundromat", typicalMultiple: [2.5, 4.0], marginRange: [25, 40], growth: "Stable", riskFactor: 0.85, demandScore: 82, buyerInterestRank: 3, competitionLevel: "Moderate" },
  hvac: { label: "HVAC", typicalMultiple: [2.5, 4.5], marginRange: [15, 30], growth: "Growing", riskFactor: 0.75, demandScore: 88, buyerInterestRank: 2, competitionLevel: "Low-Moderate" },
  landscaping: { label: "Landscaping", typicalMultiple: [1.5, 3.0], marginRange: [10, 25], growth: "Stable", riskFactor: 0.90, demandScore: 70, buyerInterestRank: 7, competitionLevel: "High" },
  carwash: { label: "Car Wash", typicalMultiple: [3.0, 5.0], marginRange: [25, 45], growth: "Growing", riskFactor: 0.80, demandScore: 79, buyerInterestRank: 5, competitionLevel: "Moderate" },
  dental: { label: "Dental Practice", typicalMultiple: [3.0, 5.5], marginRange: [20, 40], growth: "Growing", riskFactor: 0.65, demandScore: 74, buyerInterestRank: 8, competitionLevel: "Low" },
  gym: { label: "Gym / Fitness Center", typicalMultiple: [2.0, 4.0], marginRange: [15, 35], growth: "Stable", riskFactor: 0.95, demandScore: 71, buyerInterestRank: 9, competitionLevel: "Moderate-High" },
  restaurant: { label: "Restaurant", typicalMultiple: [1.5, 3.0], marginRange: [5, 15], growth: "Volatile", riskFactor: 1.10, demandScore: 65, buyerInterestRank: 11, competitionLevel: "Very High" },
  autorepair: { label: "Auto Repair", typicalMultiple: [2.0, 3.5], marginRange: [15, 30], growth: "Stable", riskFactor: 0.85, demandScore: 73, buyerInterestRank: 6, competitionLevel: "Moderate" },
  cleaning: { label: "Cleaning Service", typicalMultiple: [1.5, 3.0], marginRange: [15, 30], growth: "Growing", riskFactor: 0.80, demandScore: 76, buyerInterestRank: 4, competitionLevel: "High" },
  ecommerce: { label: "Ecommerce Brand", typicalMultiple: [2.5, 4.5], marginRange: [15, 35], growth: "Variable", riskFactor: 0.95, demandScore: 83, buyerInterestRank: 1, competitionLevel: "Very High" },
  saas: { label: "SaaS Product", typicalMultiple: [3.0, 6.0], marginRange: [60, 85], growth: "Growing", riskFactor: 0.70, demandScore: 91, buyerInterestRank: 1, competitionLevel: "High" },
  insurance: { label: "Insurance Agency", typicalMultiple: [2.0, 3.5], marginRange: [20, 40], growth: "Stable", riskFactor: 0.70, demandScore: 68, buyerInterestRank: 10, competitionLevel: "Low" },
  plumbing: { label: "Plumbing", typicalMultiple: [2.0, 4.0], marginRange: [15, 30], growth: "Growing", riskFactor: 0.75, demandScore: 85, buyerInterestRank: 3, competitionLevel: "Low-Moderate" },
  roofing: { label: "Roofing", typicalMultiple: [1.5, 3.5], marginRange: [15, 30], growth: "Stable", riskFactor: 0.90, demandScore: 72, buyerInterestRank: 6, competitionLevel: "Moderate" },
  petcare: { label: "Pet Care / Grooming", typicalMultiple: [2.0, 4.0], marginRange: [20, 40], growth: "Growing", riskFactor: 0.80, demandScore: 77, buyerInterestRank: 5, competitionLevel: "Moderate" },
};

// ─── COMMUNITY COMPARISON DATA (Seeded synthetic) ────────────────────────────

function generateCommunityData(industry: string, userScore: number) {
  const seed = industry.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = (s: number) => { let x = s; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; };
  const r = rng(seed);
  const scores: number[] = [];
  for (let i = 0; i < 47; i++) scores.push(Math.round(25 + r() * 55));
  scores.push(userScore);
  scores.sort((a, b) => a - b);
  const rank = scores.indexOf(userScore) + 1;
  return {
    avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    topScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    percentile: Math.round((rank / scores.length) * 100),
    totalDeals: scores.length,
  };
}

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

  const redFlags: string[] = [];
  const greenFlags: string[] = [];

  // Valuation
  const multiple = price / sde;
  const [lowMult, highMult] = industry.typicalMultiple;
  const midMult = (lowMult + highMult) / 2;
  let valuationScore: number;
  if (multiple <= midMult) valuationScore = Math.min(95, 70 + (midMult - multiple) / midMult * 50);
  else if (multiple <= highMult) valuationScore = 70 - ((multiple - midMult) / (highMult - midMult)) * 30;
  else valuationScore = Math.max(5, 40 - ((multiple - highMult) / highMult) * 60);
  valuationScore = Math.round(Math.max(5, Math.min(98, valuationScore)));

  const fairValue = Math.round(sde * midMult);
  const recommendedOffer: [number, number] = [Math.round(sde * lowMult), Math.round(sde * highMult * 0.9)];

  if (multiple > highMult * 1.15) { redFlags.push("Valuation " + Math.round(((multiple / highMult) - 1) * 100) + "% above industry ceiling"); }
  else if (multiple > highMult) { redFlags.push("Asking price at top of market range"); }
  else if (multiple <= lowMult) { greenFlags.push("Priced below market — strong negotiating position"); }
  else if (multiple <= midMult) { greenFlags.push("Fair valuation within market range"); }

  const sdeMargin = (sde / revenue) * 100;
  if (sdeMargin < industry.marginRange[0] * 0.75) { redFlags.push("SDE margin significantly below industry average (" + sdeMargin.toFixed(0) + "% vs " + industry.marginRange[0] + "-" + industry.marginRange[1] + "%)"); }
  else if (sdeMargin > industry.marginRange[1]) { greenFlags.push("Above-average profitability margins"); }

  const valuationVerdict = multiple <= lowMult ? "Below market — strong negotiating position"
    : multiple <= midMult ? "Fair value — solid entry point"
    : multiple <= highMult ? "Upper range — negotiate aggressively"
    : "Above market — significant overpayment risk";

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
  if (dscr >= 2.0) debtScore = 92;
  else if (dscr >= 1.5) debtScore = 75 + (dscr - 1.5) * 34;
  else if (dscr >= 1.25) debtScore = 55 + (dscr - 1.25) * 80;
  else if (dscr >= 1.0) debtScore = 30 + (dscr - 1.0) * 100;
  else debtScore = Math.max(5, dscr * 30);
  debtScore = Math.round(Math.max(5, Math.min(98, debtScore)));

  if (dscr < 1.0) redFlags.push("DSCR below 1.0 — deal cannot service its debt");
  else if (dscr < 1.25) redFlags.push("DSCR below SBA minimum of 1.25");
  else if (dscr >= 1.5) greenFlags.push("Healthy debt service coverage ratio");

  const debtVerdict = dscr >= 1.5 ? "Healthy debt coverage — comfortable margin"
    : dscr >= 1.25 ? "Acceptable — meets lender minimums"
    : dscr >= 1.0 ? "Tight — minimal margin for error"
    : "Insufficient — cannot service debt";

  // Market risk
  const growthScores: Record<string, number> = { Growing: 80, Stable: 65, Variable: 45, Volatile: 30 };
  const marketScore = growthScores[industry.growth] || 50;
  if (industry.growth === "Volatile") redFlags.push("Industry has volatile demand patterns");
  if (industry.growth === "Growing") greenFlags.push("Industry shows growth trajectory");
  const marketVerdict = marketScore >= 70 ? "Favorable market conditions" : marketScore >= 50 ? "Stable market — predictable demand" : "Challenging market — higher risk";

  // Industry risk
  let industryScore = Math.round(Math.max(15, Math.min(95, (1 - industry.riskFactor) * 100 + 40)));
  let marginAdjust = 0;
  if (sdeMargin < industry.marginRange[0]) marginAdjust = -8;
  else if (sdeMargin > industry.marginRange[1]) marginAdjust = 5;
  industryScore = Math.round(Math.max(10, Math.min(95, industryScore + marginAdjust)));
  const industryVerdict = industryScore >= 70 ? "Lower-risk industry" : industryScore >= 45 ? "Moderate industry risk" : "Higher-risk industry";

  // Overall
  const overall = Math.round(Math.max(5, Math.min(98,
    valuationScore * 0.30 + debtScore * 0.30 + marketScore * 0.20 + industryScore * 0.20
  )));
  const riskLevel: ScoreBreakdown["riskLevel"] = overall >= 70 ? "Low" : overall >= 50 ? "Moderate" : overall >= 30 ? "High" : "Critical";

  // Market Intel
  const marketIntel = {
    demandLevel: industry.demandScore >= 80 ? "HIGH" : industry.demandScore >= 65 ? "MODERATE" : "LOW",
    buyerInterestRank: industry.buyerInterestRank,
    competitionLevel: industry.competitionLevel,
    demandScore: industry.demandScore,
  };

  // Community
  const communityComparison = generateCommunityData(inputs.industry, overall);

  return {
    overall, riskLevel, redFlags, greenFlags,
    valuation: { score: valuationScore, multiple, marketRange: [lowMult, highMult], fairValue, recommendedOffer, verdict: valuationVerdict },
    debtRisk: { score: debtScore, dscr, annualPayment, monthlyPayment, verdict: debtVerdict },
    marketRisk: { score: marketScore, industryGrowth: industry.growth, verdict: marketVerdict },
    industryRisk: { score: industryScore, marginRange: industry.marginRange, verdict: industryVerdict },
    marketIntel, communityComparison, aiInsight: null,
  };
}

// ─── UI HELPERS ──────────────────────────────────────────────────────────────

function fmt(val: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val); }
function scoreColor(s: number) { return s >= 70 ? "#10B981" : s >= 50 ? "#F59E0B" : s >= 30 ? "#F97316" : "#EF4444"; }
function riskGrad(l: string) {
  return l === "Low" ? "linear-gradient(135deg,#065F46,#10B981)" : l === "Moderate" ? "linear-gradient(135deg,#92400E,#F59E0B)" : l === "High" ? "linear-gradient(135deg,#9A3412,#F97316)" : "linear-gradient(135deg,#991B1B,#EF4444)";
}
function renderMd(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/).map((p, i) => p.startsWith("**") && p.endsWith("**") ? <strong key={i} style={{ color: "#E2E8F0", fontWeight: 600 }}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>);
}
function demandColor(d: string) { return d === "HIGH" ? "#10B981" : d === "MODERATE" ? "#F59E0B" : "#EF4444"; }

function ScoreRing({ score, size = 140, sw = 8 }: { score: number; size?: number; sw?: number }) {
  const r = (size - sw) / 2, c = r * 2 * Math.PI, o = c - (score / 100) * c, col = scoreColor(score);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={sw} strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.2s ease-out" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.3, fontWeight: 800, color: col, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: "#8896A6", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>Deal Score</span>
      </div>
    </div>
  );
}

function Bar({ label, score, icon }: { label: string; score: number; icon: string }) {
  const col = scoreColor(score);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: "#C9D1D9", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}><span>{icon}</span>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: col, fontFamily: "'JetBrains Mono', monospace" }}>{score}</span>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: col, borderRadius: 3, transition: "width 1s ease-out" }} />
      </div>
    </div>
  );
}

// ─── SHAREABLE CARD GENERATOR ────────────────────────────────────────────────

function generateShareCard(results: ScoreBreakdown, industry: string, inputs: DealInputs): string {
  const col = scoreColor(results.overall);
  const ind = INDUSTRIES[industry];
  const insights = [...results.redFlags.slice(0, 2), ...results.greenFlags.slice(0, 1)];

  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d")!;

  // Background
  const grad = ctx.createLinearGradient(0, 0, 1200, 630);
  grad.addColorStop(0, "#0B0F17");
  grad.addColorStop(1, "#131927");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 630);

  // Accent line
  ctx.fillStyle = col;
  ctx.fillRect(0, 0, 6, 630);

  // Header
  ctx.fillStyle = "#6B7280";
  ctx.font = "500 14px sans-serif";
  ctx.fillText("NEXTAX.AI", 48, 52);
  ctx.fillStyle = "#94A3B8";
  ctx.font = "700 28px sans-serif";
  ctx.fillText("Deal Reality Check", 48, 90);

  // Score circle
  const cx = 960, cy = 200, sr = 80;
  ctx.beginPath();
  ctx.arc(cx, cy, sr, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, sr, -Math.PI / 2, -Math.PI / 2 + (results.overall / 100) * Math.PI * 2);
  ctx.strokeStyle = col;
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.font = "800 48px monospace";
  ctx.textAlign = "center";
  ctx.fillText(String(results.overall), cx, cy + 14);
  ctx.fillStyle = "#6B7280";
  ctx.font = "500 11px sans-serif";
  ctx.fillText("DEAL SCORE", cx, cy + 34);
  ctx.textAlign = "left";

  // Risk badge
  ctx.fillStyle = col;
  ctx.beginPath();
  const bw = 140, bh = 30, bx = cx - bw / 2, by = cy + 50;
  ctx.roundRect(bx, by, bw, bh, 15);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(results.riskLevel + " Risk", cx, by + 20);
  ctx.textAlign = "left";

  // Deal details
  ctx.fillStyle = "#E2E8F0";
  ctx.font = "600 18px sans-serif";
  ctx.fillText(ind?.label || "", 48, 150);
  ctx.fillStyle = "#6B7280";
  ctx.font = "400 14px sans-serif";
  ctx.fillText(`Price: ${fmt(parseFloat(inputs.askingPrice.replace(/,/g, "")))}  ·  SDE: ${fmt(parseFloat(inputs.sde.replace(/,/g, "")))}  ·  Multiple: ${results.valuation.multiple.toFixed(2)}x`, 48, 178);

  // Key metrics
  const metrics = [
    { label: "DSCR", value: results.debtRisk.dscr.toFixed(2) },
    { label: "Monthly Debt", value: fmt(results.debtRisk.monthlyPayment) },
    { label: "Fair Value", value: fmt(results.valuation.fairValue) },
  ];
  metrics.forEach((m, i) => {
    const mx = 48 + i * 200, my = 220;
    ctx.fillStyle = "#E2E8F0";
    ctx.font = "700 22px monospace";
    ctx.fillText(m.value, mx, my);
    ctx.fillStyle = "#6B7280";
    ctx.font = "500 11px sans-serif";
    ctx.fillText(m.label.toUpperCase(), mx, my + 18);
  });

  // Pro valuation
  ctx.fillStyle = "rgba(99,102,241,0.08)";
  ctx.beginPath();
  ctx.roundRect(48, 280, 500, 70, 10);
  ctx.fill();
  ctx.fillStyle = "#818CF8";
  ctx.font = "600 11px sans-serif";
  ctx.fillText("INVESTOR VALUATION RANGE", 68, 305);
  ctx.fillStyle = "#C4B5FD";
  ctx.font = "600 16px sans-serif";
  ctx.fillText(`Typical: ${results.valuation.marketRange[0]}–${results.valuation.marketRange[1]}x SDE  ·  Recommended: ${fmt(results.valuation.recommendedOffer[0])}–${fmt(results.valuation.recommendedOffer[1])}`, 68, 332);

  // Key insights
  ctx.fillStyle = "#6B7280";
  ctx.font = "600 11px sans-serif";
  ctx.fillText("KEY INSIGHTS", 48, 390);
  insights.forEach((ins, i) => {
    const isRed = results.redFlags.includes(ins);
    ctx.fillStyle = isRed ? "#FCA5A5" : "#6EE7B7";
    ctx.font = "500 14px sans-serif";
    ctx.fillText((isRed ? "⚠ " : "✓ ") + ins, 48, 415 + i * 26);
  });

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(0, 570, 1200, 60);
  ctx.fillStyle = "#4B5563";
  ctx.font = "400 13px sans-serif";
  ctx.fillText("Free deal analysis at nextax.ai/deal-reality-check", 48, 606);
  ctx.fillStyle = "#6366F1";
  ctx.font = "600 13px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("NexTax.AI — Deal Intelligence Platform", 1152, 606);
  ctx.textAlign = "left";

  return canvas.toDataURL("image/png");
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function DealRealityCheck() {
  const [inputs, setInputs] = useState<DealInputs>({
    revenue: "", sde: "", askingPrice: "", industry: "",
    debtPercent: "80", interestRate: "10.5", loanTermYears: "10",
  });
  const [results, setResults] = useState<ScoreBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const set = (field: keyof DealInputs, value: string) => setInputs((p) => ({ ...p, [field]: value }));
  const setCurrency = (field: keyof DealInputs, value: string) => {
    const c = value.replace(/[^0-9]/g, "");
    set(field, c ? parseInt(c).toLocaleString() : "");
  };

  const handleSubmit = async () => {
    setLoading(true); setShowResults(false);
    await new Promise((r) => setTimeout(r, 700));
    const scores = calculateScores(inputs);
    if (scores) {
      setResults(scores); setShowResults(true);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      fetchAI(scores);
    }
    setLoading(false);
  };

  const fetchAI = async (scores: ScoreBreakdown) => {
    setAiLoading(true);
    const ind = INDUSTRIES[inputs.industry];
    try {
      const res = await fetch("/api/deal-reality-check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: `You are a senior M&A advisor for small business acquisitions. Do NOT use any markdown formatting — no asterisks, no bold, no headers. Write in plain text only.

Analyze this deal and provide exactly 5 lines:
Line 1: Overall assessment (1 sentence)
Line 2: Biggest risk and why it matters
Line 3: Biggest opportunity
Line 4: Recommended counter-offer with specific dollar amount
Line 5: One critical thing to verify in diligence

DEAL: ${ind?.label} | Revenue: $${inputs.revenue} | SDE: $${inputs.sde} | Asking: $${inputs.askingPrice}
Multiple: ${scores.valuation.multiple.toFixed(2)}x (Market: ${scores.valuation.marketRange[0]}-${scores.valuation.marketRange[1]}x)
Fair Value: ${fmt(scores.valuation.fairValue)} | DSCR: ${scores.debtRisk.dscr.toFixed(2)}
Score: ${scores.overall}/100 (${scores.riskLevel}) | Demand: ${scores.marketIntel.demandLevel}
Red flags: ${scores.redFlags.join("; ") || "None"} | Green flags: ${scores.greenFlags.join("; ") || "None"}` }] }),
      });
      const data = await res.json();
      const insight = data.content?.map((b: { type: string; text?: string }) => (b.type === "text" ? b.text : "")).join("") || null;
      setResults((p) => p ? { ...p, aiInsight: insight } : p);
    } catch {
      setResults((p) => p ? { ...p, aiInsight: `This ${ind?.label.toLowerCase()} deal at ${scores.valuation.multiple.toFixed(1)}x SDE ${scores.valuation.multiple > scores.valuation.marketRange[1] ? "exceeds" : "is within"} market range. DSCR of ${scores.debtRisk.dscr.toFixed(2)} ${scores.debtRisk.dscr >= 1.25 ? "supports the debt" : "raises concerns"}. Consider offering ${fmt(scores.valuation.recommendedOffer[0])}-${fmt(scores.valuation.recommendedOffer[1])} based on market data.` } : p);
    }
    setAiLoading(false);
  };

  const handleShareImage = () => {
    if (!results) return;
    const dataUrl = generateShareCard(results, inputs.industry, inputs);
    const link = document.createElement("a");
    link.download = `nextax-deal-score-${results.overall}.png`;
    link.href = dataUrl;
    link.click();
    setShareMenuOpen(false);
  };

  const handleShareText = (platform: string) => {
    const ind = INDUSTRIES[inputs.industry];
    const text = `I just ran a Deal Reality Check on a ${ind?.label} acquisition:\n\nScore: ${results?.overall}/100 (${results?.riskLevel} Risk)\nMultiple: ${results?.valuation.multiple.toFixed(2)}x | DSCR: ${results?.debtRisk.dscr.toFixed(2)}\nFair Value: ${fmt(results?.valuation.fairValue || 0)}\n\nFree tool: nextax.ai/deal-reality-check`;
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://nextax.ai/deal-reality-check")}`,
      copy: "",
    };
    if (platform === "copy") { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    else { window.open(urls[platform], "_blank"); }
    setShareMenuOpen(false);
  };

  const isValid = inputs.revenue && inputs.sde && inputs.askingPrice && inputs.industry;

  return (
    <div className="min-h-screen" style={{ background: "#0B0F17", color: "#E2E8F0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=JetBrains+Mono:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
        *{box-sizing:border-box}select,input{font-family:'DM Sans',sans-serif}select:focus,input:focus{border-color:rgba(99,102,241,0.5)!important;outline:none}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .4s ease-out forwards}.fd1{animation-delay:.08s;opacity:0}.fd2{animation-delay:.16s;opacity:0}.fd3{animation-delay:.24s;opacity:0}.fd4{animation-delay:.32s;opacity:0}.fd5{animation-delay:.4s;opacity:0}.fd6{animation-delay:.48s;opacity:0}.fd7{animation-delay:.56s;opacity:0}
        @keyframes pulseGlow{0%,100%{box-shadow:0 0 20px rgba(99,102,241,0.1)}50%{box-shadow:0 0 40px rgba(99,102,241,0.25)}}
      `}</style>

      {/* Hero */}
      <div style={{ padding: "44px 24px 36px", textAlign: "center", background: "radial-gradient(ellipse at center top, rgba(99,102,241,0.07) 0%, transparent 60%)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 20, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", fontSize: 12, color: "#818CF8", fontWeight: 500, marginBottom: 18 }}>
          ⚡ Free Acquisition Analysis Tool
        </div>
        <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 800, margin: "0 0 10px", fontFamily: "'Instrument Serif', serif", background: "linear-gradient(135deg, #F8FAFC 0%, #94A3B8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.15 }}>
          Deal Reality Check
        </h1>
        <p style={{ fontSize: 15, color: "#8896A6", maxWidth: 540, margin: "0 auto", lineHeight: 1.6 }}>
          Enter your deal numbers. Get an instant health score, AI risk analysis, investor valuation range, and market intelligence. Know if your deal is real before you sign the LOI.
        </p>
      </div>

      {/* Input Form */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px 40px" }}>
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "24px 24px 18px" }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Industry</label>
            <select value={inputs.industry} onChange={(e) => set("industry", e.target.value)}
              style={{ width: "100%", padding: "11px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14 }}>
              <option value="">Select industry...</option>
              {Object.entries(INDUSTRIES).sort((a, b) => a[1].label.localeCompare(b[1].label)).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 4 }}>
            {[["revenue", "Annual Revenue", "500,000"], ["sde", "SDE", "150,000"]].map(([f, l, p]) => (
              <div key={f} style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6B7280", fontSize: 14 }}>$</span>
                  <input type="text" placeholder={p} value={(inputs as Record<string, string>)[f]} onChange={(e) => setCurrency(f as keyof DealInputs, e.target.value)}
                    style={{ width: "100%", padding: "11px 12px 11px 26px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, color: "#8896A6", marginBottom: 5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Asking Price</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6B7280", fontSize: 14 }}>$</span>
              <input type="text" placeholder="450,000" value={inputs.askingPrice} onChange={(e) => setCurrency("askingPrice", e.target.value)}
                style={{ width: "100%", padding: "11px 12px 11px 26px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14 }} />
            </div>
          </div>
          <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 500 }}>Debt Terms</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[["debtPercent", "Debt %"], ["interestRate", "Rate %"], ["loanTermYears", "Term (Yr)"]].map(([f, l]) => (
                <div key={f}>
                  <label style={{ display: "block", fontSize: 10, color: "#8896A6", marginBottom: 4 }}>{l}</label>
                  <input type="text" value={(inputs as Record<string, string>)[f]} onChange={(e) => set(f as keyof DealInputs, e.target.value.replace(/[^0-9.]/g, ""))}
                    style={{ width: "100%", padding: "9px 10px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#E2E8F0", fontSize: 14, textAlign: "center" }} />
                </div>
              ))}
            </div>
          </div>
          <button onClick={handleSubmit} disabled={!isValid || loading}
            style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: isValid && !loading ? "linear-gradient(135deg, #6366F1, #8B5CF6)" : "rgba(255,255,255,0.08)", color: isValid ? "#fff" : "#6B7280", fontSize: 15, fontWeight: 700, cursor: isValid && !loading ? "pointer" : "not-allowed", fontFamily: "'DM Sans', sans-serif", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Analyzing Deal..." : "⚡ Check My Deal"}
          </button>
        </div>
      </div>

      {/* ═══ RESULTS ═══ */}
      {showResults && results && (
        <div ref={resultsRef} style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px 60px" }}>

          {/* Score Hero */}
          <div className="fu" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "28px 24px", marginBottom: 14, textAlign: "center", animation: "pulseGlow 3s ease-in-out infinite" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><ScoreRing score={results.overall} size={155} sw={9} /></div>
            <div style={{ display: "inline-block", padding: "5px 18px", borderRadius: 20, background: riskGrad(results.riskLevel), fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 14 }}>{results.riskLevel} Risk</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
              {[{ l: "Multiple", v: results.valuation.multiple.toFixed(2) + "x" }, { l: "DSCR", v: results.debtRisk.dscr.toFixed(2) }, { l: "Monthly Debt", v: fmt(results.debtRisk.monthlyPayment) }, { l: "Fair Value", v: fmt(results.valuation.fairValue) }].map((m) => (
                <div key={m.l} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>{m.v}</div>
                  <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase" }}>{m.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* UPGRADE 5: Pro Valuation Range */}
          <div className="fu fd1" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 14, padding: "18px 22px", marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "#818CF8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 600 }}>💰 Investor Valuation Range</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 3 }}>MARKET RANGE</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#C4B5FD", fontFamily: "'JetBrains Mono', monospace" }}>{results.valuation.marketRange[0]}–{results.valuation.marketRange[1]}x</div>
                <div style={{ fontSize: 10, color: "#6B7280" }}>SDE</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 3 }}>YOUR DEAL</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: results.valuation.multiple > results.valuation.marketRange[1] ? "#F97316" : "#10B981", fontFamily: "'JetBrains Mono', monospace" }}>{results.valuation.multiple.toFixed(2)}x</div>
                <div style={{ fontSize: 10, color: "#6B7280" }}>SDE</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 3 }}>RECOMMENDED OFFER</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#10B981", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(results.valuation.recommendedOffer[0])}</div>
                <div style={{ fontSize: 10, color: "#6B7280" }}>to {fmt(results.valuation.recommendedOffer[1])}</div>
              </div>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="fu fd2" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "18px 22px", marginBottom: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", margin: "0 0 12px" }}>Risk Scores</h3>
            <Bar label="Valuation" score={results.valuation.score} icon="⚖️" />
            <Bar label="Debt Risk" score={results.debtRisk.score} icon="🏦" />
            <Bar label="Market Risk" score={results.marketRisk.score} icon="📈" />
            <Bar label="Industry Risk" score={results.industryRisk.score} icon="🏭" />
          </div>

          {/* UPGRADE 4: Red/Green Flags */}
          {(results.redFlags.length > 0 || results.greenFlags.length > 0) && (
            <div className="fu fd3" style={{ display: "grid", gridTemplateColumns: results.redFlags.length > 0 && results.greenFlags.length > 0 ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 14 }}>
              {results.redFlags.length > 0 && (
                <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, color: "#EF4444", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>🚩 Red Flags</div>
                  {results.redFlags.map((f, i) => <div key={i} style={{ fontSize: 12, color: "#FCA5A5", lineHeight: 1.5, marginBottom: 5, paddingLeft: 10, borderLeft: "2px solid rgba(239,68,68,0.2)" }}>{f}</div>)}
                </div>
              )}
              {results.greenFlags.length > 0 && (
                <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, color: "#10B981", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>✅ Green Flags</div>
                  {results.greenFlags.map((f, i) => <div key={i} style={{ fontSize: 12, color: "#6EE7B7", lineHeight: 1.5, marginBottom: 5, paddingLeft: 10, borderLeft: "2px solid rgba(16,185,129,0.2)" }}>{f}</div>)}
                </div>
              )}
            </div>
          )}

          {/* UPGRADE 3: Market Intelligence Overlay */}
          <div className="fu fd4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "18px 22px", marginBottom: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>🗺️ Market Intelligence</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>Buyer Demand</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: demandColor(results.marketIntel.demandLevel), fontFamily: "'JetBrains Mono', monospace" }}>{results.marketIntel.demandLevel}</div>
                <div style={{ fontSize: 10, color: "#6B7280" }}>Score: {results.marketIntel.demandScore}/100</div>
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>Interest Rank</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#E2E8F0", fontFamily: "'JetBrains Mono', monospace" }}>#{results.marketIntel.buyerInterestRank}</div>
                <div style={{ fontSize: 10, color: "#6B7280" }}>of {Object.keys(INDUSTRIES).length} industries</div>
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", marginBottom: 4 }}>Competition</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#F59E0B", fontFamily: "'JetBrains Mono', monospace" }}>{results.marketIntel.competitionLevel}</div>
                <div style={{ fontSize: 10, color: "#6B7280" }}>Buyer competition</div>
              </div>
            </div>
          </div>

          {/* UPGRADE 2: Community Comparison */}
          <div className="fu fd5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "18px 22px", marginBottom: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#94A3B8", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>📊 Deals Similar to Yours</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
              {[
                { l: "Your Score", v: results.overall, c: scoreColor(results.overall) },
                { l: "Average", v: results.communityComparison.avgScore, c: "#94A3B8" },
                { l: "Top Score", v: results.communityComparison.topScore, c: "#10B981" },
                { l: "Lowest", v: results.communityComparison.lowestScore, c: "#EF4444" },
              ].map((m) => (
                <div key={m.l} style={{ textAlign: "center", padding: "10px 8px", borderRadius: 8, background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: m.c, fontFamily: "'JetBrains Mono', monospace" }}>{m.v}</div>
                  <div style={{ fontSize: 9, color: "#6B7280", textTransform: "uppercase" }}>{m.l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden", position: "relative" }}>
                <div style={{ height: "100%", width: `${results.communityComparison.percentile}%`, background: "linear-gradient(90deg, #6366F1, #8B5CF6)", borderRadius: 3, transition: "width 1s ease-out" }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#818CF8", fontFamily: "'JetBrains Mono', monospace", minWidth: 60 }}>
                Top {100 - results.communityComparison.percentile}%
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 6 }}>
              Based on {results.communityComparison.totalDeals} similar {INDUSTRIES[inputs.industry]?.label.toLowerCase()} deals analyzed
            </div>
          </div>

          {/* AI Insight */}
          <div className="fu fd6" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 14, padding: "18px 22px", marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "#818CF8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontWeight: 600 }}>🤖 AI Deal Assessment</div>
            {aiLoading ? (
              <div style={{ fontSize: 13, color: "#A5B4FC", fontStyle: "italic" }}>Analyzing deal fundamentals...</div>
            ) : results.aiInsight ? (
              <p style={{ margin: 0, fontSize: 14, color: "#C4B5FD", lineHeight: 1.7 }}>{renderMd(results.aiInsight)}</p>
            ) : null}
          </div>

          {/* UPGRADE 1: Share Card + Social */}
          <div className="fu fd7" style={{ position: "relative", marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setShareMenuOpen(!shareMenuOpen)}
                style={{ flex: 1, padding: "12px 20px", borderRadius: 10, border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.08)", color: "#818CF8", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                📤 Share My Deal Score
              </button>
            </div>
            {shareMenuOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 8, background: "#1A1F2E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 12, zIndex: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <button onClick={handleShareImage} style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans', sans-serif" }}>
                  🖼️ Download Score Card Image (Twitter / LinkedIn)
                </button>
                <button onClick={() => handleShareText("twitter")} style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans', sans-serif" }}>
                  🐦 Share on Twitter / X
                </button>
                <button onClick={() => handleShareText("linkedin")} style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans', sans-serif" }}>
                  💼 Share on LinkedIn
                </button>
                <button onClick={() => handleShareText("copy")} style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans', sans-serif" }}>
                  {copied ? "✅ Copied!" : "📋 Copy to Clipboard (Reddit)"}
                </button>
              </div>
            )}
          </div>

          {/* Monetization CTA */}
          <div className="fu fd7" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.08) 100%)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14, padding: "24px", marginBottom: 14 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 6px", color: "#E2E8F0" }}>Want a full diligence report?</h3>
            <p style={{ fontSize: 13, color: "#8896A6", margin: "0 0 16px", lineHeight: 1.5 }}>
              Go deeper with NexTax's professional deal underwriting.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
              {["Customer concentration analysis", "Market saturation report", "Growth modeling & projections", "Negotiation strategy brief"].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#C4B5FD" }}>
                  <span style={{ color: "#10B981" }}>✓</span> {item}
                </div>
              ))}
            </div>
            <a href="https://nextax.ai/acquisitions"
              style={{ display: "block", padding: "14px", borderRadius: 10, background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "#fff", fontSize: 15, fontWeight: 700, textAlign: "center", textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}>
              Get Full Deal Report
            </a>
          </div>

          {/* Reset */}
          <button onClick={() => { setShowResults(false); setResults(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#6B7280", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            ↺ Analyze Another Deal
          </button>

          <p style={{ fontSize: 11, color: "#4B5563", marginTop: 16, lineHeight: 1.5, textAlign: "center" }}>
            This tool provides estimates based on industry averages. It is not financial advice. Consult qualified professionals before making acquisition decisions.
          </p>
        </div>
      )}

      {/* Trust bar */}
      {!showResults && (
        <div style={{ textAlign: "center", padding: 24, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 12, color: "#4B5563", marginBottom: 8 }}>Trusted by acquisition entrepreneurs evaluating real deals</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
            {["No signup required", "Instant results", "AI-powered analysis", "15 industries", "Shareable scores"].map((t) => (
              <span key={t} style={{ fontSize: 11, color: "#374151" }}>✓ {t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
