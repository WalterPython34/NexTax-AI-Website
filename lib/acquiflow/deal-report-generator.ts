// =====================================================================
// AcquiFlow — Deal Report Generator (jsPDF)
// ---------------------------------------------------------------------
// Generates an institutional-grade PDF deal report (5 or 7 pages).
//
// Core pages (always rendered):
//   1. Executive Snapshot   — Decision Bar, verdict, metrics, negotiation
//   2. Financial Underwriting — SDE normalization, debt, DSCR stress
//   3. Risk Analysis        — severity-tagged flags, deal trajectory
//   4. Market Benchmarking  — percentile bar, pricing insight, comps
//   5. Recommendation       — verdict, walk-away, sequenced actions
//
// Optional pages (rendered only when benchmarkSnapshot is provided):
//   6. Financial Benchmarking — operating ratios vs industry & market
//   7. Deal Structure & Risk Review — leverage, sources & uses, signals
//
// Pattern: matches lib/marketview/pdf-generator.ts (jsPDF, letter portrait,
// dark theme #0A0E14, indigo spine, manual y-cursor positioning).
//
// File path: lib/acquiflow/deal-report-generator.ts
// =====================================================================

import { jsPDF } from "jspdf";
import {
  DealReportInputs,
  DecisionLayerResult,
  StressScenario,
  RiskFlag,
  computeDecisionLayer,
} from "./decision-layer";

// ─── Comparable transaction shape ───────────────────────────────────────

export interface ComparableDeal {
  industry_label: string;
  state?:         string | null;
  revenue:        number;
  sde:            number;
  multiple:       number;
  year:           number;
}

// ─── Benchmark snapshot shape (optional input for pages 6-7) ────────────
//
// Mirrors the benchmark_snapshots table shape returned by
// /api/benchmarks/snapshots/latest. Caller fetches the snapshot before
// generating the PDF and passes it through. When this is undefined,
// pages 6-7 are skipped and the report stays at 5 pages.

export interface BenchmarkSnapshotForReport {
  industry_name:  string | null;
  naics_code:     string | null;
  benchmark_year: string;
  tension_indicator: string | null;

  financial_position: {
    metric_key:         string;
    metric_label:       string;
    benchmark_source:   "rma" | "dealstats" | null;
    deal_value:         number | null;
    industry_median:    number | null;
    display_percentile: number | null;
    direction:          "higher_is_better" | "lower_is_better";
    status:             string | null;
    status_color:       "red" | "yellow" | "blue" | "green" | null;
    outlier_kind:       "strong" | "validation" | "risk" | null;
    median_only:        boolean;
    insufficient_data:  boolean;
    reason?:            string;
  }[];

  risk_flags: {
    severity:   "high" | "medium" | "low" | "info";
    metric_key: string;
    message:    string;
    rule:       string;
  }[];

  strengths: { metric_key: string; message: string }[];

  interaction_insights: {
    severity: "high" | "medium" | "info";
    rule:     string;
    message:  string;
    metrics:  string[];
  }[];

  sensitivity?: {
    source_metric:    string;
    reported_value:   number;
    industry_median:  number;
    normalized_sde:   number;
    reported_sde:     number;
    normalized_dscr:  number | null;
    reported_dscr:    number | null;
    insight:          string;
  };

  deal_structure?: {
    metrics: {
      key:          "dscr" | "debt_to_sde" | "ltv";
      label:        string;
      value:        number | null;
      display:      string;
      status:       string;
      status_color: "red" | "yellow" | "blue" | "green" | null;
      explanation:  string;
    }[];
    sources_uses: {
      purchase_price:         number;
      buyer_equity:           number;
      senior_debt:            number;
      seller_note:            number;
      working_capital_needed: number;
      total_uses:             number;
      total_sources:          number;
      balanced:               boolean;
    };
    flags: {
      severity:   "high" | "medium" | "low" | "info";
      metric_key: string;
      message:    string;
      rule:       string;
    }[];
    interpretation: string[];
  };

  financial_score:         number | null;
  score_drivers:           string[];
  score_risk_dependencies: string[];
}

export interface DealReportData {
  inputs:        DealReportInputs;
  comparables:   ComparableDeal[];
  posture:       string;          // Claude-generated negotiation posture (or fallback)
  generated_at:  Date;
  // Optional override of decision layer (e.g. if the API mutated it)
  decision?:     DecisionLayerResult;
  // Optional benchmark snapshot — when present, pages 6-7 render
  benchmarkSnapshot?: BenchmarkSnapshotForReport;
  // Optional pre-fetched interpretation from /api/benchmarks/interpret
  // Used to populate the "What this means" section on page 7
  interpretation?: string[];
}

// ─── Color palette (canonical, used throughout) ─────────────────────────

const COLOR = {
  bg:           "#0A0E14",
  textPrimary:  "#F1F5F9",
  textBody:     "#CBD5E1",
  textMuted:    "#94A3B8",
  textDim:      "#6B7280",
  textFaint:    "#4B5563",
  borderSoft:   "#1F2937",
  indigo:       "#818CF8",
  emerald:      "#10B981",
  amber:        "#F59E0B",
  orange:       "#F97316",
  red:          "#EF4444",
  emeraldDark:  "#0F1B17",
  redDark:      "#1F0A0A",
  amberText:    "#FDE68A",
  orangeText:   "#FED7AA",
  redText:      "#FCA5A5",
  emeraldText:  "#6EE7B7",
};

const setHex = (doc: jsPDF, hex: string, kind: "fill" | "draw" | "text") => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (kind === "fill") doc.setFillColor(r, g, b);
  if (kind === "draw") doc.setDrawColor(r, g, b);
  if (kind === "text") doc.setTextColor(r, g, b);
};

// ─── Formatting helpers ─────────────────────────────────────────────────

const fmtUsd = (n: number): string => {
  if (n === null || n === undefined || isNaN(n)) return "\u2014";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
};

const fmtPct = (n: number, decimals: number = 1): string => {
  if (n === null || n === undefined || isNaN(n)) return "\u2014";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(decimals)}%`;
};

// ─── Helpers for pages 6-7 (benchmark snapshot rendering) ───────────────

/**
 * Map snapshot status_color to PDF color tokens for pills and cells.
 * Stays inside the existing dark palette so the new pages look cohesive.
 */
const STATUS_COLOR_MAP = {
  red:    { fill: "#1F0A0A", stroke: "#7F1D1D", text: "#FCA5A5" },
  yellow: { fill: "#1F1808", stroke: "#92400E", text: "#FDE68A" },
  blue:   { fill: "#0A1424", stroke: "#1E3A8A", text: "#93C5FD" },
  green:  { fill: "#0F1B17", stroke: "#065F46", text: "#6EE7B7" },
} as const;

const fmtRatio = (n: number | null | undefined, decimals: number = 2): string => {
  if (n === null || n === undefined || isNaN(n)) return "\u2014";
  return `${n.toFixed(decimals)}x`;
};

/** Format an integer percentile as 1st / 2nd / 3rd / Nth. */
const fmtPercentile = (p: number | null | undefined): string => {
  if (p === null || p === undefined || isNaN(p)) return "\u2014";
  const n = Math.round(p);
  const lastTwo = n % 100;
  const lastOne = n % 10;
  let suffix = "th";
  if (lastTwo < 11 || lastTwo > 13) {
    if (lastOne === 1) suffix = "st";
    else if (lastOne === 2) suffix = "nd";
    else if (lastOne === 3) suffix = "rd";
  }
  return `${n}${suffix}`;
};

/** Format a metric value based on its key (percentage / ratio / days). */
function fmtMetricValue(metric_key: string, value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "\u2014";
  if (metric_key.endsWith("_pct")) return `${value.toFixed(1)}%`;
  if (metric_key === "days_inventory_outstanding") return `${Math.round(value)}d`;
  return `${value.toFixed(2)}x`;
}

/**
 * Resolve the status pill (label + colors) for a benchmark row. Three-way
 * outlier classification takes precedence over the default status band.
 */
function statusPillForRow(row: {
  outlier_kind: "strong" | "validation" | "risk" | null;
  status: string | null;
  status_color: "red" | "yellow" | "blue" | "green" | null;
  insufficient_data: boolean;
  median_only: boolean;
}): { label: string; bg: string; text: string } {
  if (row.insufficient_data) {
    return { label: "Not Meaningful", bg: "#1F2937", text: "#94A3B8" };
  }
  if (row.outlier_kind === "strong") {
    return { label: "Strong Outlier", bg: STATUS_COLOR_MAP.green.fill, text: STATUS_COLOR_MAP.green.text };
  }
  if (row.outlier_kind === "validation") {
    return { label: "Validation Outlier", bg: STATUS_COLOR_MAP.yellow.fill, text: STATUS_COLOR_MAP.yellow.text };
  }
  if (row.outlier_kind === "risk") {
    return { label: "Risk Outlier", bg: STATUS_COLOR_MAP.red.fill, text: STATUS_COLOR_MAP.red.text };
  }
  if (row.status && row.status_color) {
    const c = STATUS_COLOR_MAP[row.status_color];
    return { label: row.status, bg: c.fill, text: c.text };
  }
  return { label: "\u2014", bg: "#1F2937", text: "#6B7280" };
}

// ─── Layout constants (Letter portrait) ─────────────────────────────────

const PW = 612;   // page width  in pt
const PH = 792;   // page height in pt
const M  = 36;    // outer margin
const CW = PW - M * 2;
const SPINE_W = 3;

// ─── Page chrome (header + footer) ──────────────────────────────────────

function newPage(doc: jsPDF, pageNum: number, pageLabel: string, isFirst = false): void {
  if (!isFirst) doc.addPage();
  // Background
  setHex(doc, COLOR.bg, "fill");
  doc.rect(0, 0, PW, PH, "F");
  // Indigo left spine
  setHex(doc, COLOR.indigo, "fill");
  doc.rect(0, 0, SPINE_W, PH, "F");
  // Top brand band
  setHex(doc, COLOR.bg, "fill");
  doc.rect(M, 28, CW, 18, "F");
  // Brand text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setHex(doc, COLOR.textPrimary, "text");
  doc.text("ACQUIFLOW", M + 4, 40);
  setHex(doc, COLOR.indigo, "text");
  doc.text(".", M + 4 + doc.getTextWidth("ACQUIFLOW"), 40);
  // Page tag right
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setHex(doc, COLOR.textDim, "text");
  doc.text(pageLabel.toUpperCase(), PW - M, 40, { align: "right" });
  // Brand divider
  setHex(doc, COLOR.borderSoft, "draw");
  doc.setLineWidth(0.5);
  doc.line(M, 50, PW - M, 50);
  // Footer
  doc.setFontSize(7);
  setHex(doc, COLOR.textFaint, "text");
  doc.text("acquiflow.io", M, PH - 24);
  doc.text(`Page ${pageNum} of 5 - ${pageLabel}`, PW - M, PH - 24, { align: "right" });
}

// ─── Drawing primitives ─────────────────────────────────────────────────

function drawCell(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  label: string, value: string,
  valueColor: string = COLOR.textPrimary,
  valueSize: number = 11
): void {
  // Background
  setHex(doc, "#13181F", "fill");
  doc.rect(x, y, w, h, "F");
  // Border
  setHex(doc, COLOR.borderSoft, "draw");
  doc.setLineWidth(0.5);
  doc.rect(x, y, w, h, "S");
  // Label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  setHex(doc, COLOR.textDim, "text");
  doc.text(label.toUpperCase(), x + 7, y + 11);
  // Value
  doc.setFont("courier", "bold");
  doc.setFontSize(valueSize);
  setHex(doc, valueColor, "text");
  doc.text(value, x + 7, y + 24);
}

function drawSectionHeader(doc: jsPDF, x: number, y: number, label: string): void {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  setHex(doc, COLOR.indigo, "fill");
  doc.rect(x, y - 5, 10, 0.7, "F");
  doc.text(label.toUpperCase(), x + 14, y);
}

function drawWrappedText(
  doc: jsPDF,
  text: string,
  x: number, y: number, maxW: number,
  fontSize: number = 9,
  color: string = COLOR.textBody,
  lineHeight: number = 1.4,
  font: "normal" | "italic" | "bold" = "normal"
): number {
  doc.setFont("helvetica", font);
  doc.setFontSize(fontSize);
  setHex(doc, color, "text");
  const lines = doc.splitTextToSize(text, maxW);
  const lh = fontSize * lineHeight;
  lines.forEach((line: string, i: number) => {
    doc.text(line, x, y + i * lh);
  });
  return y + lines.length * lh;
}

function drawBadge(
  doc: jsPDF,
  x: number, y: number,
  text: string,
  bgColor: string,
  textColor: string,
  fontSize: number = 7,
  bold: boolean = true,
  outlined: boolean = false
): number {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  const padX = 5;
  const w = doc.getTextWidth(text) + padX * 2;
  const h = fontSize + 4;
  if (outlined) {
    setHex(doc, bgColor, "draw");
    doc.setLineWidth(0.6);
    doc.rect(x, y - h + 3, w, h, "S");
  } else {
    setHex(doc, bgColor, "fill");
    doc.rect(x, y - h + 3, w, h, "F");
  }
  setHex(doc, textColor, "text");
  doc.text(text, x + padX, y);
  return x + w;
}

// ─── PAGE 1 — EXECUTIVE SNAPSHOT ────────────────────────────────────────

function drawPage1(doc: jsPDF, data: DealReportData, decision: DecisionLayerResult): void {
  newPage(doc, 1, "Executive Snapshot", true);
  const { inputs } = data;

  let y = 70;

  // Eyebrow
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  doc.text("EXECUTIVE SNAPSHOT", M, y);
  y += 16;

  // Deal title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  setHex(doc, COLOR.textPrimary, "text");
  doc.text(inputs.industry_label || "Untitled Deal", M, y);
  y += 13;

  // Subtitle
  const locParts = [inputs.city, inputs.state].filter(Boolean).join(", ");
  const subtitleParts = [
    locParts || null,
    inputs.industry_label,
    `Generated ${data.generated_at.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
  ].filter(Boolean);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setHex(doc, COLOR.textDim, "text");
  doc.text(subtitleParts.join(" \u00B7 "), M, y);
  y += 18;

  // ─── DECISION BAR ──────────────────────────────────────────────────────
  const recColor =
    decision.recommendation === "PURSUE"      ? COLOR.emerald :
    decision.recommendation === "INVESTIGATE" ? COLOR.amber :
    decision.recommendation === "RESTRUCTURE" ? COLOR.orange :
                                                 COLOR.red;
  const barH = 50;
  setHex(doc, COLOR.emeraldDark, "fill");
  doc.rect(M, y, CW, barH, "F");
  setHex(doc, recColor, "draw");
  doc.setLineWidth(0.8);
  doc.rect(M, y, CW, barH, "S");

  // 5 fields, each separated by a thin divider
  const fieldW = CW / 5;
  const labelY = y + 14;
  const valueY = y + 33;

  const decisionFields: [string, string, string][] = [
    ["RECOMMENDATION", decision.recommendation, recColor],
    ["TARGET PRICE",   `${fmtUsd(decision.target_price_low)}-${fmtUsd(decision.target_price_high)}`, COLOR.textPrimary],
    ["CONFIDENCE",     decision.confidence, decision.confidence === "High" ? COLOR.emerald : decision.confidence === "Medium" ? COLOR.amber : COLOR.orange],
    ["LEVERAGE",       decision.leverage,    decision.leverage === "STRONG" ? COLOR.indigo : decision.leverage === "MODERATE" ? COLOR.amber : COLOR.orange],
    ["LENDER READY",   decision.lender_readiness === "FAIL" ? "Fail" : decision.lender_readiness === "CONDITIONAL" ? "Conditional" : "Pass OK", decision.lender_readiness === "FAIL" ? COLOR.red : decision.lender_readiness === "CONDITIONAL" ? COLOR.amber : COLOR.emerald],
  ];

  decisionFields.forEach((field, i) => {
    const fx = M + i * fieldW;
    // Divider (right edge of all but last)
    if (i < decisionFields.length - 1) {
      setHex(doc, "#1F2937", "draw");
      doc.setLineWidth(0.4);
      doc.line(fx + fieldW, y + 8, fx + fieldW, y + barH - 8);
    }
    // Label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    setHex(doc, COLOR.textDim, "text");
    doc.text(field[0], fx + 8, labelY);
    // Value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setHex(doc, field[2], "text");
    doc.text(field[1], fx + 8, valueY);
  });

  y += barH + 14;

  // ─── VERDICT BANNER ────────────────────────────────────────────────────
  const banH = 50;
  setHex(doc, "#0F1F18", "fill");
  doc.rect(M, y, CW, banH, "F");
  setHex(doc, COLOR.emerald, "draw");
  doc.setLineWidth(0.6);
  doc.rect(M, y, CW, banH, "S");

  // Score circle
  const scoreCx = M + 30;
  const scoreCy = y + banH / 2;
  const scoreR  = 17;
  setHex(doc, "#0A2218", "fill");
  doc.circle(scoreCx, scoreCy, scoreR, "F");
  setHex(doc, COLOR.emerald, "draw");
  doc.setLineWidth(1.5);
  doc.circle(scoreCx, scoreCy, scoreR, "S");
  doc.setFont("courier", "bold");
  doc.setFontSize(15);
  setHex(doc, COLOR.emerald, "text");
  doc.text(String(inputs.overall_score), scoreCx, scoreCy + 2, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.text("SCORE", scoreCx, scoreCy + 10, { align: "center" });

  // Verdict text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.emerald, "text");
  doc.text("VERDICT", M + 60, y + 17);
  doc.setFontSize(13);
  doc.text(verdictLabel(inputs.overall_score, decision.recommendation), M + 60, y + 31);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setHex(doc, COLOR.textDim, "text");
  doc.text(verdictSubline(decision), M + 60, y + 42);

  y += banH + 18;

  // ─── KEY METRICS ───────────────────────────────────────────────────────
  drawSectionHeader(doc, M, y, "Key metrics");
  y += 10;

  const cellH = 32;
  const cellGap = 4;
  const cellsPerRow = 4;
  const cellW = (CW - cellGap * (cellsPerRow - 1)) / cellsPerRow;

  const row1: [string, string, string][] = [
    ["Asking",        fmtUsd(inputs.asking_price), COLOR.textPrimary],
    ["Adj. SDE",      fmtUsd(inputs.usable_sde ?? inputs.sde), COLOR.textPrimary],
    ["Multiple",      `${inputs.valuation_multiple.toFixed(2)}x`, COLOR.textPrimary],
    ["DSCR",          `${inputs.dscr.toFixed(2)}x`, inputs.dscr >= 1.5 ? COLOR.emerald : inputs.dscr >= 1.25 ? COLOR.amber : COLOR.red],
  ];
  row1.forEach((cell, i) => {
    drawCell(doc, M + i * (cellW + cellGap), y, cellW, cellH, cell[0], cell[1], cell[2]);
  });
  y += cellH + cellGap;

  const askGapPct = inputs.fair_value > 0 ? round(((inputs.asking_price - inputs.fair_value) / inputs.fair_value) * 100, 1) : 0;
  const row2: [string, string, string][] = [
    ["Fair value",     fmtUsd(inputs.fair_value), askGapPct < 0 ? COLOR.emerald : COLOR.textPrimary],
    ["Valuation gap",  fmtPct(askGapPct), askGapPct < 0 ? COLOR.emerald : askGapPct > 15 ? COLOR.red : COLOR.textPrimary],
    ["Percentile",     decision.pricing_insight.percentile_ordinal, COLOR.textPrimary],
    ["Risk level",     inputs.risk_level, riskLevelColor(inputs.risk_level)],
  ];
  row2.forEach((cell, i) => {
    drawCell(doc, M + i * (cellW + cellGap), y, cellW, cellH, cell[0], cell[1], cell[2]);
  });
  y += cellH + 16;

  // ─── NEGOTIATION POSITIONING ──────────────────────────────────────────
  drawSectionHeader(doc, M, y, "Negotiation positioning");
  y += 10;

  const negBoxY = y;
  const negBoxH = 78;
  setHex(doc, "#0E1322", "fill");
  doc.rect(M, negBoxY, CW, negBoxH, "F");
  setHex(doc, COLOR.indigo, "draw");
  doc.setLineWidth(0.5);
  doc.rect(M, negBoxY, CW, negBoxH, "S");

  // Top row: leverage label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setHex(doc, COLOR.textMuted, "text");
  doc.text("BUYER LEVERAGE", M + 10, y + 13);
  doc.setFontSize(11);
  const leverageColor = decision.leverage === "STRONG" ? COLOR.indigo : decision.leverage === "MODERATE" ? COLOR.amber : COLOR.orange;
  setHex(doc, leverageColor, "text");
  doc.text(decision.leverage, PW - M - 10, y + 13, { align: "right" });

  // Divider
  setHex(doc, "#1F2937", "draw");
  doc.setLineWidth(0.4);
  doc.line(M + 8, y + 19, PW - M - 8, y + 19);

  // Tactical posture box (inset, dark)
  const postureY = y + 26;
  const postureH = 44;
  setHex(doc, "#06090E", "fill");
  doc.rect(M + 8, postureY, CW - 16, postureH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  setHex(doc, COLOR.indigo, "text");
  doc.text("RECOMMENDED POSTURE", M + 14, postureY + 11);
  drawWrappedText(doc, data.posture, M + 14, postureY + 22, CW - 28, 9, COLOR.textPrimary, 1.3, "italic");

  y += negBoxH + 14;

  // ─── INVESTMENT TAKE ──────────────────────────────────────────────────
  drawSectionHeader(doc, M, y, "Investment take");
  y += 10;

  // Italic body w/ left bar
  setHex(doc, COLOR.indigo, "fill");
  doc.rect(M, y - 3, 1.5, 38, "F");
  const take = buildInvestmentTake(decision, inputs);
  drawWrappedText(doc, take, M + 8, y + 7, CW - 16, 9, COLOR.textBody, 1.5, "italic");
}

// ─── PAGE 2 — FINANCIAL UNDERWRITING ────────────────────────────────────

function drawPage2(doc: jsPDF, data: DealReportData, decision: DecisionLayerResult): void {
  newPage(doc, 2, "Financial Underwriting");
  const { inputs } = data;

  let y = 70;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  doc.text("FINANCIAL UNDERWRITING", M, y);
  y += 14;

  doc.setFontSize(14);
  setHex(doc, COLOR.textPrimary, "text");
  doc.text("Earnings normalization & debt structure", M, y);
  y += 13;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setHex(doc, COLOR.textDim, "text");
  doc.text("Figures derived from buyer inputs and AcquiFlow normalization engine", M, y);
  y += 16;

  // ─── CONTEXT LEAD ──────────────────────────────────────────────────────
  setHex(doc, "#0F1322", "fill");
  doc.rect(M, y - 3, CW, 22, "F");
  setHex(doc, COLOR.indigo, "fill");
  doc.rect(M, y - 3, 1.5, 22, "F");
  drawWrappedText(
    doc,
    "This section reconstructs true earnings and tests debt capacity under realistic downside scenarios.",
    M + 10, y + 9, CW - 20, 9, COLOR.textBody, 1.4, "italic"
  );
  y += 30;

  // ─── SDE NORMALIZATION TABLE ──────────────────────────────────────────
  drawSectionHeader(doc, M, y, "SDE normalization");
  y += 12;

  // Build rows from evidence_profile + reported/usable
  const reported = inputs.reported_sde ?? inputs.sde;
  const usable   = inputs.usable_sde   ?? inputs.sde;
  const totalAdj = reported - usable;
  const normRows: [string, string, string, string][] = [
    ["Seller-reported SDE", fmtUsd(reported), "-", "-"],
  ];
  if (totalAdj > 0) {
    // We don't have line-item adjustments, so represent the haircut as a single "Normalization adjustments" row
    const pctOfReported = (totalAdj / reported) * 100;
    normRows.push(["Normalization adjustments", "-", `-${fmtUsd(totalAdj)}`, `${fmtPct(-pctOfReported)}`]);
  }
  normRows.push(["Adjusted SDE (used in analysis)", "", fmtUsd(usable), reported > 0 ? fmtPct(((usable - reported) / reported) * 100) : "-"]);

  // Headers
  const colX = [M, M + 230, M + 340, M + 460];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setHex(doc, COLOR.textDim, "text");
  doc.text("COMPONENT", colX[0], y);
  doc.text("REPORTED",  colX[1], y);
  doc.text("ADJUSTED",  colX[2], y);
  doc.text("Delta",         colX[3], y);
  setHex(doc, COLOR.borderSoft, "draw");
  doc.setLineWidth(0.5);
  doc.line(M, y + 3, PW - M, y + 3);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  normRows.forEach((row, idx) => {
    const isLast = idx === normRows.length - 1;
    if (isLast) {
      // Highlight the totals row
      setHex(doc, "#11142A", "fill");
      doc.rect(M - 2, y - 9, CW + 4, 14, "F");
      doc.setFont("helvetica", "bold");
      setHex(doc, COLOR.textPrimary, "text");
      doc.text(row[0], colX[0], y);
      doc.setFont("courier", "bold");
      setHex(doc, COLOR.indigo, "text");
      doc.text(row[2], colX[2], y);
      doc.text(row[3], colX[3], y);
    } else {
      doc.setFont("helvetica", "normal");
      setHex(doc, COLOR.textBody, "text");
      doc.text(row[0], colX[0], y);
      doc.setFont("courier", "normal");
      setHex(doc, COLOR.textBody, "text");
      doc.text(row[1], colX[1], y);
      const isAmberDelta = row[2].startsWith("-") || row[3].startsWith("-");
      setHex(doc, isAmberDelta ? COLOR.amber : COLOR.textBody, "text");
      doc.text(row[2], colX[2], y);
      doc.text(row[3], colX[3], y);
    }
    y += 13;
    setHex(doc, "#161B25", "draw");
    doc.setLineWidth(0.3);
    doc.line(M, y - 4, PW - M, y - 4);
  });
  y += 4;

  // SDE Interpretation
  drawInterpretBox(doc, M, y, CW, "Interpretation", decision.sde_interpretation);
  y += interpretBoxHeight(doc, decision.sde_interpretation, CW) + 12;

  // ─── DEBT STRUCTURE ───────────────────────────────────────────────────
  drawSectionHeader(doc, M, y, "Debt structure assumption");
  y += 12;

  const debtPct  = inputs.debt_percent  ?? 90;
  const interest = inputs.interest_rate ?? 10.75;
  const term     = inputs.term_years    ?? 10;
  const loanAmt  = inputs.asking_price * (debtPct / 100);
  const downAmt  = inputs.asking_price - loanAmt;
  const monthly  = inputs.monthly_payment ?? estimateMonthly(loanAmt, interest, term);
  const annual   = monthly * 12;

  const debtCellW = (CW - 12) / 4;
  const debtCells: [string, string][] = [
    ["Loan size",     fmtUsd(loanAmt)],
    ["Down payment",  `${fmtUsd(downAmt)} (${(100 - debtPct).toFixed(0)}%)`],
    ["Rate / Term",   `${interest.toFixed(2)}% / ${term}y`],
    ["Annual debt",   fmtUsd(annual)],
  ];
  debtCells.forEach((c, i) => {
    drawCell(doc, M + i * (debtCellW + 4), y, debtCellW, 30, c[0], c[1], COLOR.textPrimary, 9.5);
  });
  y += 30 + 14;

  // ─── DSCR STRESS SCENARIOS ────────────────────────────────────────────
  drawSectionHeader(doc, M, y, "DSCR stress scenarios");
  y += 12;

  // Headers
  const sCols = [M, M + 250, M + 350, M + 440, M + 510];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setHex(doc, COLOR.textDim, "text");
  doc.text("SCENARIO", sCols[0], y);
  doc.text("SDE",      sCols[1], y);
  doc.text("DSCR",     sCols[2], y);
  doc.text("STATUS",   sCols[3], y);
  setHex(doc, COLOR.borderSoft, "draw");
  doc.setLineWidth(0.5);
  doc.line(M, y + 3, PW - M, y + 3);
  y += 11;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  decision.stress_scenarios.forEach((s, i) => {
    const dscrColor   = s.comfortable ? COLOR.emerald : s.passed ? COLOR.amber : COLOR.red;
    const statusLabel = s.passed ? "PASS" : "FAIL";
    setHex(doc, COLOR.textBody, "text");
    doc.text(s.label, sCols[0], y);
    doc.setFont("courier", "normal");
    doc.text(fmtUsd(s.sde), sCols[1], y);
    setHex(doc, dscrColor, "text");
    doc.text(`${s.dscr.toFixed(2)}x`, sCols[2], y);
    doc.setFont("helvetica", "bold");
    doc.text(statusLabel, sCols[3], y);
    doc.setFont("helvetica", "normal");
    setHex(doc, COLOR.textBody, "text");
    y += 13;
    setHex(doc, "#161B25", "draw");
    doc.setLineWidth(0.3);
    doc.line(M, y - 4, PW - M, y - 4);
  });
  y += 4;

  // DSCR Interpretation
  drawInterpretBox(doc, M, y, CW, "Interpretation", decision.dscr_interpretation);
}

// ─── PAGE 3 — RISK ANALYSIS ─────────────────────────────────────────────

function drawPage3(doc: jsPDF, data: DealReportData, decision: DecisionLayerResult): void {
  newPage(doc, 3, "Risk Analysis");

  let y = 70;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  doc.text("RISK ANALYSIS", M, y);
  y += 14;

  doc.setFontSize(14);
  setHex(doc, COLOR.textPrimary, "text");
  doc.text("Risk severity & deal trajectory", M, y);
  y += 13;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setHex(doc, COLOR.textDim, "text");
  doc.text("Risks ranked by impact severity \u2014 High / Medium / Low", M, y);
  y += 18;

  // ─── RISK FLAGS ────────────────────────────────────────────────────────
  drawSectionHeader(doc, M, y, "Risk flags by severity");
  y += 12;

  const flagsToShow = decision.risk_flags.slice(0, 6); // cap to avoid overflow
  flagsToShow.forEach((flag) => {
    y = drawRiskFlag(doc, M, y, CW, flag);
    y += 6;
    if (y > PH - 200) return; // safety stop before trajectory section
  });
  y += 6;

  // ─── DEAL TRAJECTORY ──────────────────────────────────────────────────
  drawSectionHeader(doc, M, y, "Deal trajectory");
  y += 12;

  const trajH = 80;
  setHex(doc, "#13181F", "fill");
  doc.rect(M, y, CW, trajH, "F");
  setHex(doc, COLOR.borderSoft, "draw");
  doc.setLineWidth(0.5);
  doc.rect(M, y, CW, trajH, "S");

  // Top row: Trend + Confidence
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setHex(doc, COLOR.textDim, "text");
  doc.text("TREND", M + 10, y + 14);
  doc.text("CONFIDENCE", PW - M - 10, y + 14, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const trendColor = decision.trajectory_label === "Improving" ? COLOR.emerald :
                     decision.trajectory_label === "Declining" ? COLOR.red :
                     decision.trajectory_label === "Stable"    ? COLOR.emerald : COLOR.textMuted;
  setHex(doc, trendColor, "text");
  doc.text(decision.trajectory_label, M + 10, y + 30);

  doc.setFontSize(11);
  const confColor = decision.trajectory_confidence === "High" ? COLOR.emerald :
                    decision.trajectory_confidence === "Medium" ? COLOR.amber : COLOR.orange;
  setHex(doc, confColor, "text");
  doc.text(decision.trajectory_confidence, PW - M - 10, y + 30, { align: "right" });

  // Divider
  setHex(doc, "#1F2937", "draw");
  doc.setLineWidth(0.4);
  doc.line(M + 8, y + 42, PW - M - 8, y + 42);

  // Bottom row: 3 indicators
  const trajCells = [
    ["Y/Y REVENUE",      "Stable",    COLOR.emerald],
    ["SDE MARGIN",       data.inputs.revenue > 0 ? `${((data.inputs.sde / data.inputs.revenue) * 100).toFixed(0)}%` : "-", COLOR.textMuted],
    ["CUSTOMER CHURN",   data.inputs.evidence_profile?.concentrationBand === "high" ? "Elevated" : "Typical", data.inputs.evidence_profile?.concentrationBand === "high" ? COLOR.amber : COLOR.textMuted],
  ];
  const trajColW = (CW - 16) / 3;
  trajCells.forEach((c, i) => {
    const cx = M + 10 + i * trajColW;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    setHex(doc, COLOR.textDim, "text");
    doc.text(c[0], cx, y + 56);
    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    setHex(doc, c[2], "text");
    doc.text(c[1], cx, y + 70);
  });
}

function drawRiskFlag(doc: jsPDF, x: number, y: number, w: number, flag: RiskFlag): number {
  // Determine palette by severity
  const palette = flag.severity === "HIGH"   ? { stripe: COLOR.red,    bg: "#1F0808", text: COLOR.redText,    badgeBg: COLOR.red,    badgeText: "#FFFFFF" } :
                  flag.severity === "MEDIUM" ? { stripe: COLOR.orange, bg: "#1A0F07", text: COLOR.orangeText, badgeBg: COLOR.orange, badgeText: "#FFFFFF" } :
                                                { stripe: COLOR.amber,  bg: "#1A1305", text: COLOR.amberText,  badgeBg: COLOR.amber,  badgeText: "#1F1410" };

  // Compute height based on detail wrapping
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const detailLines = doc.splitTextToSize(flag.detail, w - 20);
  const baseH = 22;
  const detailH = detailLines.length * 11;
  const h = baseH + detailH + 8;

  // Background + left stripe
  setHex(doc, palette.bg, "fill");
  doc.rect(x, y, w, h, "F");
  setHex(doc, palette.stripe, "fill");
  doc.rect(x, y, 3, h, "F");

  // Badge row
  let bx = x + 10;
  bx = drawBadge(doc, bx, y + 14, flag.severity, palette.badgeBg, palette.badgeText, 7, true, false);
  bx += 6;
  if (flag.isDealBreaker) {
    bx = drawBadge(doc, bx, y + 14, "POTENTIAL DEAL BREAKER", palette.stripe, palette.stripe, 7, true, true);
    bx += 6;
  }

  // Headline
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setHex(doc, palette.text, "text");
  doc.text(flag.headline, bx, y + 14);

  // Category right-aligned
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  setHex(doc, COLOR.textDim, "text");
  doc.text(flag.category, x + w - 8, y + 14, { align: "right" });

  // Detail
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setHex(doc, COLOR.textBody, "text");
  detailLines.forEach((line: string, i: number) => {
    doc.text(line, x + 10, y + 26 + i * 11);
  });

  return y + h;
}

// ─── PAGE 4 — MARKET BENCHMARKING ───────────────────────────────────────

function drawPage4(doc: jsPDF, data: DealReportData, decision: DecisionLayerResult): void {
  newPage(doc, 4, "Market Benchmarking");
  const { inputs, comparables } = data;

  let y = 70;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  doc.text("MARKET BENCHMARKING", M, y);
  y += 14;

  doc.setFontSize(14);
  setHex(doc, COLOR.textPrimary, "text");
  doc.text("Comparable transactions & positioning", M, y);
  y += 13;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setHex(doc, COLOR.textDim, "text");
  const sampleSize = inputs.benchmark_sample_size ?? 312;
  doc.text(`${inputs.industry_label} benchmark \u00B7 ${sampleSize.toLocaleString()} transactions \u00B7 proprietary AcquiFlow database`, M, y);
  y += 18;

  // ─── ASKING MULTIPLE VS RANGE ─────────────────────────────────────────
  drawSectionHeader(doc, M, y, "Asking multiple vs market range");
  y += 12;

  const benchMid  = decision.pricing_insight.median_multiple;
  const benchLow  = inputs.benchmark_low  ?? round(benchMid * 0.7, 2);
  const benchHigh = inputs.benchmark_high ?? round(benchMid * 1.4, 2);

  // Container box
  const barBoxH = 76;
  setHex(doc, "#13181F", "fill");
  doc.rect(M, y, CW, barBoxH, "F");
  setHex(doc, COLOR.borderSoft, "draw");
  doc.setLineWidth(0.5);
  doc.rect(M, y, CW, barBoxH, "S");

  // Range labels (top of box)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setHex(doc, COLOR.textDim, "text");
  doc.text(`Low: ${benchLow.toFixed(1)}x`,    M + 14, y + 14);
  doc.text(`Median: ${benchMid.toFixed(1)}x`, M + CW / 2, y + 14, { align: "center" });
  doc.text(`High: ${benchHigh.toFixed(1)}x`,  PW - M - 14, y + 14, { align: "right" });

  // The bar (rendered in 3 segments: green, amber, red)
  const barX = M + 14;
  const barY = y + 22;
  const barW = CW - 28;
  const barH = 6;
  const seg = barW / 3;
  setHex(doc, "#0F2018", "fill"); doc.rect(barX,           barY, seg, barH, "F");
  setHex(doc, "#1F1808", "fill"); doc.rect(barX + seg,     barY, seg, barH, "F");
  setHex(doc, "#1F0A0A", "fill"); doc.rect(barX + seg * 2, barY, seg, barH, "F");

  // Marker
  const askMult     = inputs.valuation_multiple;
  const askPosRatio = clamp01((askMult - benchLow) / (benchHigh - benchLow));
  const markerX     = barX + askPosRatio * barW;
  setHex(doc, COLOR.indigo, "fill");
  doc.rect(markerX - 4, barY - 4, 8, barH + 8, "F");
  // Median tick
  setHex(doc, COLOR.textPrimary, "draw");
  doc.setLineWidth(0.5);
  doc.line(barX + barW / 2, barY - 2, barX + barW / 2, barY + barH + 2);

  // Stats badge below
  const statY = barY + barH + 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setHex(doc, COLOR.textDim, "text");
  doc.text("THIS DEAL",  M + CW / 4 - 50, statY);
  doc.text("PERCENTILE", M + CW / 2 - 30, statY);
  doc.text("POSITION",   M + (3 * CW) / 4 - 8, statY);
  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  setHex(doc, COLOR.indigo, "text");
  doc.text(`${askMult.toFixed(2)}x`, M + CW / 4 - 50, statY + 12);
  setHex(doc, COLOR.emerald, "text");
  doc.text(decision.pricing_insight.percentile_ordinal, M + CW / 2 - 30, statY + 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const positionText = decision.pricing_insight.position === "below" ? "Below market" : decision.pricing_insight.position === "above" ? "Above market" : "At market";
  const positionColor = decision.pricing_insight.position === "below" ? COLOR.emerald : decision.pricing_insight.position === "above" ? COLOR.red : COLOR.amber;
  setHex(doc, positionColor, "text");
  doc.text(positionText, M + (3 * CW) / 4 - 8, statY + 12);

  y += barBoxH + 14;

  // ─── PRICING INSIGHT CALLOUT ───────────────────────────────────────────
  const piColor = decision.pricing_insight.position === "below" ? COLOR.emerald :
                  decision.pricing_insight.position === "above" ? COLOR.red    : COLOR.amber;
  const piBg    = decision.pricing_insight.position === "below" ? "#0A1F18"   :
                  decision.pricing_insight.position === "above" ? "#1F0A0A"   : "#1F1808";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const proseLines = doc.splitTextToSize(decision.pricing_insight.prose, CW - 28);
  const piH = 18 + proseLines.length * 11 + 10;

  setHex(doc, piBg, "fill");
  doc.rect(M, y, CW, piH, "F");
  setHex(doc, piColor, "fill");
  doc.rect(M, y, 3, piH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setHex(doc, piColor, "text");
  doc.text("PRICING INSIGHT", M + 14, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setHex(doc, COLOR.textPrimary, "text");
  proseLines.forEach((line: string, i: number) => {
    doc.text(line, M + 14, y + 28 + i * 11);
  });
  y += piH + 14;

  // ─── REPRESENTATIVE COMPARABLES TABLE ─────────────────────────────────
  drawSectionHeader(doc, M, y, "Representative comparable transactions");
  y += 12;

  // Headers
  const cCols = [M, M + 240, M + 320, M + 400, M + 480];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setHex(doc, COLOR.textDim, "text");
  doc.text("INDUSTRY TRANSACTION", cCols[0], y);
  doc.text("REVENUE",  cCols[1], y);
  doc.text("SDE",      cCols[2], y);
  doc.text("MULTIPLE", cCols[3], y);
  doc.text("YEAR",     cCols[4], y);
  setHex(doc, COLOR.borderSoft, "draw");
  doc.setLineWidth(0.5);
  doc.line(M, y + 3, PW - M, y + 3);
  y += 11;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  const compsToShow = comparables.slice(0, 4);
  compsToShow.forEach((c) => {
    setHex(doc, COLOR.textBody, "text");
    const stateSuffix = c.state ? ` (${c.state})` : "";
    doc.text(`${c.industry_label}${stateSuffix}`, cCols[0], y);
    doc.setFont("courier", "normal");
    doc.text(fmtUsd(c.revenue), cCols[1], y);
    doc.text(fmtUsd(c.sde),     cCols[2], y);
    doc.text(`${c.multiple.toFixed(1)}x`, cCols[3], y);
    setHex(doc, COLOR.textDim, "text");
    doc.text(String(c.year), cCols[4], y);
    doc.setFont("helvetica", "normal");
    setHex(doc, COLOR.textBody, "text");
    y += 13;
    setHex(doc, "#161B25", "draw");
    doc.setLineWidth(0.3);
    doc.line(M, y - 4, PW - M, y - 4);
  });

  // "This deal" highlight row
  setHex(doc, "#11142A", "fill");
  doc.rect(M - 2, y - 9, CW + 4, 14, "F");
  doc.setFont("helvetica", "bold");
  setHex(doc, COLOR.indigo, "text");
  doc.text("\u25B6 This deal", cCols[0], y);
  doc.setFont("courier", "bold");
  doc.text(fmtUsd(inputs.revenue),                          cCols[1], y);
  doc.text(fmtUsd(inputs.usable_sde ?? inputs.sde),         cCols[2], y);
  doc.text(`${inputs.valuation_multiple.toFixed(2)}x`,      cCols[3], y);
  doc.text(String(data.generated_at.getFullYear()),         cCols[4], y);
}

// ─── PAGE 5 — RECOMMENDATION ────────────────────────────────────────────

function drawPage5(doc: jsPDF, data: DealReportData, decision: DecisionLayerResult): void {
  newPage(doc, 5, "Recommendation");

  let y = 70;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  doc.text("RECOMMENDATION & NEXT STEPS", M, y);
  y += 14;

  doc.setFontSize(14);
  setHex(doc, COLOR.textPrimary, "text");
  doc.text("Path to LOI", M, y);
  y += 13;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setHex(doc, COLOR.textDim, "text");
  doc.text("Sequenced actions, pricing guidance, and walk-away discipline", M, y);
  y += 18;

  // ─── RECOMMENDATION BANNER ────────────────────────────────────────────
  const recColor = decision.recommendation === "PURSUE"      ? COLOR.emerald :
                   decision.recommendation === "INVESTIGATE" ? COLOR.amber :
                   decision.recommendation === "RESTRUCTURE" ? COLOR.orange : COLOR.red;
  const recBg    = decision.recommendation === "PURSUE"      ? "#0F2018"    :
                   decision.recommendation === "INVESTIGATE" ? "#1F1808"    :
                   decision.recommendation === "RESTRUCTURE" ? "#1A1004"    : "#1F0808";
  const recH = 38;
  setHex(doc, recBg, "fill");
  doc.rect(M, y, CW, recH, "F");
  setHex(doc, recColor, "draw");
  doc.setLineWidth(0.6);
  doc.rect(M, y, CW, recH, "S");

  // Icon circle
  setHex(doc, "#0A2218", "fill");
  doc.circle(M + 22, y + recH / 2, 11, "F");
  setHex(doc, recColor, "draw");
  doc.setLineWidth(1);
  doc.circle(M + 22, y + recH / 2, 11, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setHex(doc, recColor, "text");
  doc.text("\u2197", M + 22, y + recH / 2 + 4, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setHex(doc, recColor, "text");
  doc.text("RECOMMENDATION", M + 42, y + 14);
  doc.setFontSize(15);
  doc.text(buildRecommendationLine(decision.recommendation), M + 42, y + 30);

  y += recH + 12;

  // ─── WALK-AWAY THRESHOLD ──────────────────────────────────────────────
  const waH = 50;
  setHex(doc, "#1F0808", "fill");
  doc.rect(M, y, CW, waH, "F");
  setHex(doc, COLOR.red, "draw");
  doc.setLineWidth(1);
  doc.rect(M, y, CW, waH, "S");

  // Icon circle
  setHex(doc, "#280A0A", "fill");
  doc.circle(M + 22, y + waH / 2, 12, "F");
  setHex(doc, COLOR.red, "draw");
  doc.setLineWidth(1);
  doc.circle(M + 22, y + waH / 2, 12, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setHex(doc, COLOR.red, "text");
  doc.text("\u00D7", M + 22, y + waH / 2 + 4, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setHex(doc, COLOR.red, "text");
  doc.text("WALK-AWAY THRESHOLD", M + 42, y + 14);
  doc.setFont("courier", "bold");
  doc.setFontSize(15);
  doc.text(fmtUsd(decision.walk_away_threshold), M + 42 + 130, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setHex(doc, COLOR.redText, "text");
  const waLine = `Above ${fmtUsd(decision.walk_away_threshold)}, expected return falls below acceptable risk threshold. Do not proceed without structural changes \u2014 seller note, earn-out, or revised debt terms.`;
  const waLines = doc.splitTextToSize(waLine, CW - 60);
  waLines.forEach((line: string, i: number) => {
    doc.text(line, M + 42, y + 26 + i * 10);
  });

  y += waH + 14;

  // ─── SUGGESTED ACTIONS ────────────────────────────────────────────────
  drawSectionHeader(doc, M, y, "Suggested actions (sequenced)");
  y += 12;

  const actions = buildSuggestedActions(decision, data.inputs);
  actions.forEach((act, i) => {
    const actH = 28;
    setHex(doc, "#13181F", "fill");
    doc.rect(M, y, CW, actH, "F");
    setHex(doc, COLOR.indigo, "fill");
    doc.rect(M, y, 2, actH, "F");

    doc.setFont("courier", "bold");
    doc.setFontSize(8.5);
    setHex(doc, COLOR.indigo, "text");
    doc.text(String(i + 1).padStart(2, "0"), M + 8, y + 13);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setHex(doc, COLOR.textPrimary, "text");
    doc.text(act.title, M + 28, y + 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setHex(doc, COLOR.textBody, "text");
    const detailLines = doc.splitTextToSize(act.detail, CW - 38);
    detailLines.slice(0, 1).forEach((line: string) => {
      doc.text(line, M + 28, y + 22);
    });

    y += actH + 4;
  });

  y += 10;

  // ─── WALK-AWAY TRIGGERS ───────────────────────────────────────────────
  drawSectionHeader(doc, M, y, "Walk-away triggers");
  y += 12;

  const triggers = buildWalkAwayTriggers(decision);
  const triggerW = (CW - 8) / 2;
  triggers.slice(0, 2).forEach((t, i) => {
    const tx = M + i * (triggerW + 8);
    const tH = 44;
    setHex(doc, "#1F0808", "fill");
    doc.rect(tx, y, triggerW, tH, "F");
    setHex(doc, COLOR.red, "draw");
    doc.setLineWidth(0.4);
    doc.rect(tx, y, triggerW, tH, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    setHex(doc, COLOR.red, "text");
    doc.text(t.category, tx + 8, y + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setHex(doc, COLOR.redText, "text");
    const lines = doc.splitTextToSize(t.detail, triggerW - 16);
    lines.slice(0, 3).forEach((line: string, li: number) => {
      doc.text(line, tx + 8, y + 22 + li * 9);
    });
  });
  y += 50;

  // ─── DISCLAIMER ───────────────────────────────────────────────────────
  setHex(doc, COLOR.borderSoft, "draw");
  doc.setLineWidth(0.4);
  doc.line(M, y, PW - M, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setHex(doc, COLOR.textFaint, "text");
  const disclaimer = "This report is generated for informational purposes only. AcquiFlow is not a registered investment advisor, broker-dealer, or M&A advisor. All figures are estimates based on buyer-provided inputs and proprietary benchmark data. Independent verification of financials, legal review, and qualified professional advice are required before any acquisition decision.";
  drawWrappedText(doc, disclaimer, M, y, CW, 7, COLOR.textFaint, 1.4, "normal");
}

// ─── Helper: interpret box ──────────────────────────────────────────────

function drawInterpretBox(doc: jsPDF, x: number, y: number, w: number, label: string, text: string): void {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const lines = doc.splitTextToSize(text, w - 24);
  const h = 14 + lines.length * 11 + 8;

  setHex(doc, "#0F1322", "fill");
  doc.rect(x, y, w, h, "F");
  setHex(doc, COLOR.indigo, "fill");
  doc.rect(x, y, 2, h, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  setHex(doc, COLOR.indigo, "text");
  doc.text(label.toUpperCase(), x + 10, y + 13);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  setHex(doc, COLOR.textBody, "text");
  lines.forEach((line: string, i: number) => {
    doc.text(line, x + 10, y + 25 + i * 11);
  });
}

function interpretBoxHeight(doc: jsPDF, text: string, w: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const lines = doc.splitTextToSize(text, w - 24);
  return 14 + lines.length * 11 + 8;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function round(n: number, d = 0): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function estimateMonthly(loanAmt: number, ratePct: number, years: number): number {
  const r = (ratePct / 100) / 12;
  const n = years * 12;
  if (r <= 0 || n <= 0) return loanAmt / 120;
  return (loanAmt * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function riskLevelColor(level: string): string {
  switch ((level || "").toLowerCase()) {
    case "low":      return COLOR.emerald;
    case "moderate": return COLOR.amber;
    case "high":     return COLOR.orange;
    case "critical": return COLOR.red;
    default:         return COLOR.textPrimary;
  }
}

function verdictLabel(score: number, rec: string): string {
  if (rec === "PURSUE" && score >= 80) return "HIGH CONVICTION \u00B7 PURSUE";
  if (rec === "PURSUE")                 return "PURSUE";
  if (rec === "INVESTIGATE")            return "INVESTIGATE \u00B7 VALIDATE";
  if (rec === "RESTRUCTURE")            return "RESTRUCTURE REQUIRED";
  return "PASS";
}

function verdictSubline(d: DecisionLayerResult): string {
  const parts: string[] = [];
  if (d.leverage === "STRONG") parts.push("Strong fundamentals");
  if (d.pricing_insight.position === "below") parts.push("Below-market pricing");
  if (d.lender_readiness === "PASS+" || d.lender_readiness === "PASS") parts.push("DSCR comfortable");
  if (parts.length === 0) {
    if (d.recommendation === "PASS") parts.push("Multiple risk concentrations identified");
    else if (d.recommendation === "RESTRUCTURE") parts.push("Pricing premium requires structural concessions");
    else parts.push("Mixed signals \u2014 see full analysis");
  }
  return parts.slice(0, 3).join(" \u00B7 ");
}

function buildInvestmentTake(d: DecisionLayerResult, inputs: DealReportInputs): string {
  const positionClause = d.pricing_insight.position === "below"
    ? `${Math.abs(d.pricing_insight.fair_value_gap / inputs.fair_value * 100).toFixed(0)}% below the ${fmtUsd(inputs.fair_value)} implied fair value`
    : d.pricing_insight.position === "above"
      ? `${(d.pricing_insight.fair_value_gap / inputs.fair_value * -100).toFixed(0)}% above the ${fmtUsd(inputs.fair_value)} implied fair value`
      : `consistent with the ${fmtUsd(inputs.fair_value)} implied fair value`;
  const dscrClause = d.lender_readiness === "PASS+" || d.lender_readiness === "PASS"
    ? "with durable DSCR coverage"
    : d.lender_readiness === "CONDITIONAL"
      ? "with marginal DSCR coverage"
      : "with insufficient DSCR coverage at proposed terms";
  const riskClause = d.risk_flags.find(f => f.severity === "HIGH")
    ? `Primary risk concentration: ${d.risk_flags.find(f => f.severity === "HIGH")!.headline.toLowerCase()} \u2014 must be addressed before LOI.`
    : "No HIGH-severity risk flags identified.";

  return `${capitalize(d.pricing_insight.position === "below" ? "Strong" : d.pricing_insight.position === "above" ? "Premium" : "Fair")} pricing relative to industry comps ${dscrClause}. Asking multiple of ${inputs.valuation_multiple.toFixed(2)}x sits ${positionClause}. ${riskClause}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildRecommendationLine(rec: string): string {
  switch (rec) {
    case "PURSUE":      return "PROCEED to financial diligence";
    case "INVESTIGATE": return "VALIDATE before LOI";
    case "RESTRUCTURE": return "RESTRUCTURE before proceeding";
    case "PASS":        return "PASS \u2014 do not proceed";
    default:            return "REVIEW";
  }
}

function buildSuggestedActions(
  d:      DecisionLayerResult,
  inputs: DealReportInputs
): { title: string; detail: string }[] {
  const targetLow  = d.target_price_low;
  const targetHigh = d.target_price_high;
  const askMult    = inputs.valuation_multiple;
  const adjSDE     = inputs.usable_sde ?? inputs.sde;
  const offerMult  = adjSDE > 0 ? targetLow / adjSDE : 0;

  const actions: { title: string; detail: string }[] = [];

  // Action 1: opening offer
  actions.push({
    title:  `Open negotiation at ${fmtUsd(targetLow)}`,
    detail: `${offerMult.toFixed(2)}x SDE \u2014 anchored to lower-bound comps. Walk-away ceiling: ${fmtUsd(d.walk_away_threshold)}.`,
  });

  // Action 2: financial validation
  actions.push({
    title:  "Request 3 years of tax returns + add-back schedule",
    detail: "Validate normalization adjustments via verifiable earnings record before signing LOI.",
  });

  // Action 3: dynamic based on risk profile
  const customerRisk = d.risk_flags.find(f => f.headline.toLowerCase().includes("customer"));
  if (customerRisk) {
    actions.push({
      title:  "Validate top-customer relationships and contracts",
      detail: customerRisk.detail.split(".")[0] + ". Confirm contracts transfer and survive owner exit.",
    });
  } else if (d.risk_flags.find(f => f.headline.toLowerCase().includes("add-back"))) {
    actions.push({
      title:  "Independently verify all reported add-backs",
      detail: "Document each adjustment with supporting evidence \u2014 unverified add-backs reduce effective SDE and compress justified multiple.",
    });
  } else {
    actions.push({
      title:  "Conduct customer/operational interviews",
      detail: "Validate revenue concentration, contract structure, and owner dependency before advancing to LOI.",
    });
  }

  // Action 4: structural protection
  actions.push({
    title:  "Structure 90-day seller transition + 12-month earn-out",
    detail: "Earn-out tied to revenue retention de-risks key-person concentration and aligns seller incentives post-close.",
  });

  return actions;
}

function buildWalkAwayTriggers(d: DecisionLayerResult): { category: string; detail: string }[] {
  const out: { category: string; detail: string }[] = [];

  // Always include financial trigger
  out.push({
    category: "FINANCIAL",
    detail:   "If reported SDE is >15% lower than verified, pricing thesis collapses. Renegotiate or walk.",
  });

  // Customer trigger if customer risk present
  const customerRisk = d.risk_flags.find(f => f.headline.toLowerCase().includes("customer"));
  if (customerRisk) {
    out.push({
      category: "CUSTOMER",
      detail:   "If top-customer retention is at risk and seller resists earn-out structure, walk.",
    });
  } else {
    out.push({
      category: "OPERATIONAL",
      detail:   "If owner-dependency risks cannot be mitigated through structured transition, walk.",
    });
  }

  return out;
}

// =====================================================================
// PAGE 6 — FINANCIAL BENCHMARKING & OPERATING QUALITY
// ---------------------------------------------------------------------
// Renders only when data.benchmarkSnapshot is provided. Shows score
// banner, optional tension banner, operating-ratio benchmark table
// (no colored bars — percentile badges + status pills), and the
// SDE Normalization Sensitivity card.
// =====================================================================

function drawPage6(
  doc: jsPDF,
  data: DealReportData,
  decision: DecisionLayerResult,
): void {
  const snap = data.benchmarkSnapshot;
  if (!snap) return;

  newPage(doc, 6, "Financial Benchmarking");
  const { inputs } = data;

  let y = 70;

  // ─── Page title ──────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  doc.text("FINANCIAL BENCHMARKING", M, y);
  y += 14;

  doc.setFontSize(14);
  setHex(doc, COLOR.textPrimary, "text");
  doc.text("Operating quality vs industry & market peers", M, y);
  y += 13;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setHex(doc, COLOR.textDim, "text");
  doc.text(
    "Benchmarking against aggregated industry financial statement data and observed SMB transaction data.",
    M, y,
  );
  y += 22;

  // ─── SECTION 1 — Score Snapshot banner ───────────────────────────────
  drawSectionHeader(doc, M, y, "Financial score snapshot");
  y += 14;

  const snapshotBoxH = 92;
  setHex(doc, "#13181F", "fill");
  doc.rect(M, y, CW, snapshotBoxH, "F");
  setHex(doc, COLOR.borderSoft, "draw");
  doc.setLineWidth(0.5);
  doc.rect(M, y, CW, snapshotBoxH, "S");

  const colW = CW / 3;

  // Left: big score
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setHex(doc, COLOR.textDim, "text");
  doc.text("FINANCIAL SCORE", M + 16, y + 18);

  const scoreColor =
    snap.financial_score === null ? COLOR.textDim
    : snap.financial_score >= 75   ? COLOR.emerald
    : snap.financial_score >= 55   ? COLOR.indigo
    : snap.financial_score >= 35   ? COLOR.amber
    :                                COLOR.red;

  doc.setFont("courier", "bold");
  doc.setFontSize(36);
  setHex(doc, scoreColor, "text");
  const scoreStr = snap.financial_score !== null ? String(snap.financial_score) : "\u2014";
  doc.text(scoreStr, M + 16, y + 56);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setHex(doc, COLOR.textDim, "text");
  const scoreW = snap.financial_score !== null ? doc.getTextWidth(scoreStr) + 6 : 24;
  doc.text("/ 100", M + 16 + scoreW, y + 56);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setHex(doc, COLOR.textMuted, "text");
  doc.text("Composite of profitability, coverage,", M + 16, y + 72);
  doc.text("liquidity, and efficiency",              M + 16, y + 82);

  // Center: industry context
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setHex(doc, COLOR.textDim, "text");
  doc.text("INDUSTRY CONTEXT", M + colW + 16, y + 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setHex(doc, COLOR.textPrimary, "text");
  const industryName = snap.industry_name ?? inputs.industry_label ?? "\u2014";
  const industryLines = doc.splitTextToSize(industryName, colW - 32);
  industryLines.slice(0, 2).forEach((line: string, i: number) => {
    doc.text(line, M + colW + 16, y + 38 + i * 14);
  });

  if (snap.naics_code) {
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    setHex(doc, COLOR.textMuted, "text");
    doc.text(
      `NAICS ${snap.naics_code}`,
      M + colW + 16,
      y + 38 + Math.min(industryLines.length, 2) * 14 + 4,
    );
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setHex(doc, COLOR.textDim, "text");
  doc.text(`Benchmark year: ${snap.benchmark_year}`, M + colW + 16, y + 82);

  // Right: top drivers
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setHex(doc, COLOR.textDim, "text");
  doc.text("TOP DRIVERS", M + colW * 2 + 16, y + 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setHex(doc, COLOR.textBody, "text");
  snap.score_drivers.slice(0, 3).forEach((driver, i) => {
    doc.text(`\u2022  ${driver}`, M + colW * 2 + 16, y + 38 + i * 13);
  });

  y += snapshotBoxH + 18;

  // ─── Tension Indicator banner (if present) ───────────────────────────
  if (snap.tension_indicator) {
    const tensionLines = doc.splitTextToSize(snap.tension_indicator, CW - 32);
    const tensionH = 14 + tensionLines.length * 11 + 10;

    setHex(doc, "#1F1808", "fill");
    doc.rect(M, y, CW, tensionH, "F");
    setHex(doc, COLOR.amber, "fill");
    doc.rect(M, y, 3, tensionH, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setHex(doc, COLOR.amberText, "text");
    doc.text("MIXED SIGNALS", M + 14, y + 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setHex(doc, COLOR.textBody, "text");
    tensionLines.forEach((line: string, i: number) => {
      doc.text(line, M + 14, y + 28 + i * 11);
    });

    y += tensionH + 14;
  }

  // ─── SECTION 2 — Operating Ratios benchmark table ────────────────────
  drawSectionHeader(doc, M, y, "Operating ratios vs benchmarks");
  y += 14;

  // Column anchors (right-aligned for value cols, left-aligned for label/status)
  const colMetric = M + 12;
  const colDeal   = M + 220;
  const colBench  = M + 310;
  const colPctile = M + 400;
  const colStatus = M + 460;

  // Header row
  setHex(doc, "#13181F", "fill");
  doc.rect(M, y, CW, 22, "F");
  setHex(doc, COLOR.borderSoft, "draw");
  doc.setLineWidth(0.5);
  doc.rect(M, y, CW, 22, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.textMuted, "text");
  doc.text("METRIC",     colMetric, y + 14);
  doc.text("DEAL",       colDeal,   y + 14, { align: "right" });
  doc.text("BENCHMARK",  colBench,  y + 14, { align: "right" });
  doc.text("PERCENTILE", colPctile, y + 14, { align: "right" });
  doc.text("STATUS",     colStatus, y + 14);
  y += 22;

  // Body rows
  const rowH = 26;
  const rowsToRender = snap.financial_position.filter(r =>
    !(r.deal_value === null && r.industry_median === null && !r.insufficient_data)
  );

  rowsToRender.forEach((row, rowIdx) => {
    if (y + rowH > PH - 220) return;   // leave room for sensitivity card

    if (rowIdx % 2 === 1) {
      setHex(doc, "#0E1218", "fill");
      doc.rect(M, y, CW, rowH, "F");
    }
    setHex(doc, COLOR.borderSoft, "draw");
    doc.setLineWidth(0.4);
    doc.line(M, y + rowH, M + CW, y + rowH);

    // Metric label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setHex(doc, COLOR.textBody, "text");
    doc.text(row.metric_label, colMetric, y + 16);

    // Deal value
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    setHex(doc, COLOR.textPrimary, "text");
    doc.text(fmtMetricValue(row.metric_key, row.deal_value), colDeal, y + 16, { align: "right" });

    // Benchmark
    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    setHex(doc, row.industry_median !== null ? COLOR.textBody : COLOR.textDim, "text");
    doc.text(fmtMetricValue(row.metric_key, row.industry_median), colBench, y + 16, { align: "right" });

    // Percentile (badge or directional indicator or em-dash)
    if (row.display_percentile !== null) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      const pctText = fmtPercentile(row.display_percentile);
      const pctW = doc.getTextWidth(pctText) + 10;
      setHex(doc, "#1A2438", "fill");
      doc.rect(colPctile - pctW, y + 9, pctW, 13, "F");
      setHex(doc, COLOR.indigo, "text");
      doc.text(pctText, colPctile - 5, y + 18, { align: "right" });
    } else if (row.median_only) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      setHex(doc, COLOR.textDim, "text");
      doc.text("\u00B110%", colPctile, y + 16, { align: "right" });
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setHex(doc, COLOR.textDim, "text");
      doc.text("\u2014", colPctile, y + 16, { align: "right" });
    }

    // Status pill
    const pill = statusPillForRow(row);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const pillW = doc.getTextWidth(pill.label) + 12;
    setHex(doc, pill.bg, "fill");
    doc.rect(colStatus, y + 8, pillW, 14, "F");
    setHex(doc, pill.text, "text");
    doc.text(pill.label, colStatus + 6, y + 17);

    y += rowH;
  });

  y += 14;

  // ─── SECTION 3 — SDE Normalization Sensitivity ───────────────────────
  if (snap.sensitivity && y < PH - 200) {
    drawSectionHeader(doc, M, y, "SDE normalization sensitivity");
    y += 14;

    const breaches = snap.sensitivity.normalized_dscr !== null && snap.sensitivity.normalized_dscr < 1.30;
    const sensColor = breaches ? COLOR.red : COLOR.amber;
    const sensBg    = breaches ? "#1F0A0A" : "#1F1808";
    const sensText  = breaches ? COLOR.redText : COLOR.amberText;

    // Headline insight callout
    const insightLines = doc.splitTextToSize(snap.sensitivity.insight, CW - 32);
    const insightH = 14 + insightLines.length * 11 + 10;

    setHex(doc, sensBg, "fill");
    doc.rect(M, y, CW, insightH, "F");
    setHex(doc, sensColor, "fill");
    doc.rect(M, y, 3, insightH, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setHex(doc, sensText, "text");
    doc.text("WHAT IF SDE NORMALIZES?", M + 14, y + 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setHex(doc, COLOR.textBody, "text");
    insightLines.forEach((line: string, i: number) => {
      doc.text(line, M + 14, y + 28 + i * 11);
    });
    y += insightH + 12;

    // Five comparison cells: Reported SDE | Normalized SDE | Reported DSCR | Normalized DSCR | Lender Threshold
    const cellH = 50;
    const cellW = (CW - 16) / 5;
    const cells = [
      { label: "REPORTED SDE",     value: fmtUsd(snap.sensitivity.reported_sde),      muted: false, highlight: false },
      { label: "NORMALIZED SDE",   value: fmtUsd(snap.sensitivity.normalized_sde),    muted: true,  highlight: false },
      { label: "REPORTED DSCR",    value: fmtRatio(snap.sensitivity.reported_dscr),   muted: false, highlight: false },
      { label: "NORMALIZED DSCR",  value: fmtRatio(snap.sensitivity.normalized_dscr), muted: false, highlight: breaches },
      { label: "LENDER THRESHOLD", value: "1.30x",                                    muted: true,  highlight: false },
    ];

    let cellX = M;
    for (const cell of cells) {
      setHex(doc, "#13181F", "fill");
      doc.rect(cellX, y, cellW, cellH, "F");
      setHex(doc, COLOR.borderSoft, "draw");
      doc.setLineWidth(0.5);
      doc.rect(cellX, y, cellW, cellH, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      setHex(doc, COLOR.textDim, "text");
      doc.text(cell.label, cellX + 8, y + 14);

      doc.setFont("courier", "bold");
      doc.setFontSize(13);
      const valueColor =
        cell.highlight ? COLOR.redText
        : cell.muted   ? COLOR.textMuted
        :                COLOR.textPrimary;
      setHex(doc, valueColor, "text");
      doc.text(cell.value, cellX + 8, y + 36);

      cellX += cellW + 4;
    }
    y += cellH + 10;

    // Threshold breach warning banner
    if (breaches && y < PH - 60) {
      const warnH = 26;
      setHex(doc, "#1F0A0A", "fill");
      doc.rect(M, y, CW, warnH, "F");
      setHex(doc, COLOR.red, "fill");
      doc.rect(M, y, 3, warnH, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      setHex(doc, COLOR.redText, "text");
      doc.text(
        "Normalized DSCR falls below the 1.30x lender threshold \u2014 financing depends on validating reported earnings.",
        M + 14, y + 17,
      );
    }
  }
}

// =====================================================================
// PAGE 7 — DEAL STRUCTURE & RISK REVIEW
// ---------------------------------------------------------------------
// Renders only when data.benchmarkSnapshot is provided. Shows three
// large metric cards (DSCR / Debt-SDE / LTV), Sources & Uses table
// with balance check, three risk subsections, and the optional
// "What this means" interpretation paragraphs.
// =====================================================================

function drawPage7(
  doc: jsPDF,
  data: DealReportData,
  decision: DecisionLayerResult,
): void {
  const snap = data.benchmarkSnapshot;
  if (!snap) return;

  newPage(doc, 7, "Deal Structure & Risk Review");

  let y = 70;

  // ─── Page title ──────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  doc.text("DEAL STRUCTURE & RISK REVIEW", M, y);
  y += 14;

  doc.setFontSize(14);
  setHex(doc, COLOR.textPrimary, "text");
  doc.text("Acquisition structure, leverage, and committee-level risks", M, y);
  y += 13;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setHex(doc, COLOR.textDim, "text");
  doc.text(
    "Tests whether the proposed structure can support the debt \u2014 separate from operating ratios.",
    M, y,
  );
  y += 22;

  // ─── SECTION 1 — Three deal-structure metric cards ───────────────────
  if (snap.deal_structure && snap.deal_structure.metrics.length > 0) {
    drawSectionHeader(doc, M, y, "Deal structure overview");
    y += 14;

    const cardH = 70;
    const cardW = (CW - 16) / 3;
    let cardX = M;

    for (const metric of snap.deal_structure.metrics) {
      const c = metric.status_color
        ? STATUS_COLOR_MAP[metric.status_color]
        : { fill: "#13181F", stroke: COLOR.borderSoft, text: COLOR.textMuted };

      setHex(doc, c.fill, "fill");
      doc.rect(cardX, y, cardW, cardH, "F");
      setHex(doc, c.stroke, "draw");
      doc.setLineWidth(0.7);
      doc.rect(cardX, y, cardW, cardH, "S");

      // Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      setHex(doc, COLOR.textDim, "text");
      doc.text(metric.label.toUpperCase(), cardX + 12, y + 16);

      // Big value
      doc.setFont("courier", "bold");
      doc.setFontSize(22);
      setHex(doc, COLOR.textPrimary, "text");
      doc.text(metric.display, cardX + 12, y + 42);

      // Status
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setHex(doc, c.text, "text");
      doc.text(metric.status, cardX + 12, y + 60);

      cardX += cardW + 8;
    }

    y += cardH + 20;
  }

  // ─── SECTION 2 — Sources & Uses ──────────────────────────────────────
  if (snap.deal_structure) {
    const su = snap.deal_structure.sources_uses;

    drawSectionHeader(doc, M, y, "Sources & uses");
    y += 14;

    const tableW = (CW - 12) / 2;
    const rowH2 = 22;

    // Two parallel tables: Uses (left), Sources (right)

    // Uses table
    let leftY = y;
    setHex(doc, "#13181F", "fill");
    doc.rect(M, leftY, tableW, rowH2, "F");
    setHex(doc, COLOR.borderSoft, "draw");
    doc.setLineWidth(0.5);
    doc.rect(M, leftY, tableW, rowH2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setHex(doc, COLOR.textMuted, "text");
    doc.text("USES", M + 12, leftY + 14);
    doc.text("AMOUNT", M + tableW - 12, leftY + 14, { align: "right" });
    leftY += rowH2;

    const usesRows = [
      { label: "Purchase Price",   amount: su.purchase_price,         bold: false },
      { label: "Working Capital",  amount: su.working_capital_needed, bold: false },
      { label: "Total Uses",       amount: su.total_uses,             bold: true  },
    ];

    for (const r of usesRows) {
      setHex(doc, COLOR.borderSoft, "draw");
      doc.line(M, leftY + rowH2, M + tableW, leftY + rowH2);

      doc.setFont("helvetica", r.bold ? "bold" : "normal");
      doc.setFontSize(9);
      setHex(doc, r.bold ? COLOR.textPrimary : COLOR.textBody, "text");
      doc.text(r.label, M + 12, leftY + 14);

      doc.setFont("courier", r.bold ? "bold" : "normal");
      doc.setFontSize(9);
      setHex(doc, r.bold ? COLOR.textPrimary : COLOR.textBody, "text");
      doc.text(fmtUsd(r.amount), M + tableW - 12, leftY + 14, { align: "right" });

      leftY += rowH2;
    }

    // Sources table
    let rightY = y;
    const rightX = M + tableW + 12;
    setHex(doc, "#13181F", "fill");
    doc.rect(rightX, rightY, tableW, rowH2, "F");
    setHex(doc, COLOR.borderSoft, "draw");
    doc.rect(rightX, rightY, tableW, rowH2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setHex(doc, COLOR.textMuted, "text");
    doc.text("SOURCES", rightX + 12, rightY + 14);
    doc.text("AMOUNT", rightX + tableW - 12, rightY + 14, { align: "right" });
    rightY += rowH2;

    const sourcesRows = [
      { label: "Buyer Equity",  amount: su.buyer_equity,  bold: false },
      { label: "Senior Debt",   amount: su.senior_debt,   bold: false },
      { label: "Seller Note",   amount: su.seller_note,   bold: false },
      { label: "Total Sources", amount: su.total_sources, bold: true  },
    ];

    for (const r of sourcesRows) {
      setHex(doc, COLOR.borderSoft, "draw");
      doc.line(rightX, rightY + rowH2, rightX + tableW, rightY + rowH2);

      doc.setFont("helvetica", r.bold ? "bold" : "normal");
      doc.setFontSize(9);
      setHex(doc, r.bold ? COLOR.textPrimary : COLOR.textBody, "text");
      doc.text(r.label, rightX + 12, rightY + 14);

      doc.setFont("courier", r.bold ? "bold" : "normal");
      doc.setFontSize(9);
      setHex(doc, r.bold ? COLOR.textPrimary : COLOR.textBody, "text");
      doc.text(fmtUsd(r.amount), rightX + tableW - 12, rightY + 14, { align: "right" });

      rightY += rowH2;
    }

    y = Math.max(leftY, rightY) + 8;

    // Balance check banner
    if (!su.balanced) {
      const gap = su.total_uses - su.total_sources;
      const bannerH = 24;
      setHex(doc, "#1F1808", "fill");
      doc.rect(M, y, CW, bannerH, "F");
      setHex(doc, COLOR.amber, "fill");
      doc.rect(M, y, 3, bannerH, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      setHex(doc, COLOR.amberText, "text");
      doc.text(
        `\u26A0  Sources & Uses do not balance \u2014 ${gap > 0 ? "short" : "over"} by ${fmtUsd(Math.abs(gap))}. Review structure.`,
        M + 14, y + 16,
      );
      y += bannerH + 14;
    } else {
      y += 4;
    }
  } else {
    // No deal-structure inputs provided
    setHex(doc, "#13181F", "fill");
    doc.rect(M, y, CW, 32, "F");
    setHex(doc, COLOR.borderSoft, "draw");
    doc.setLineWidth(0.5);
    doc.rect(M, y, CW, 32, "S");

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    setHex(doc, COLOR.textMuted, "text");
    doc.text(
      "Acquisition structure inputs (purchase price, equity, debt mix) not provided in this analysis.",
      M + 14, y + 20,
    );
    y += 38;
  }

  // ─── SECTION 3 — Risk Signals ────────────────────────────────────────
  if (y > PH - 180) return;

  drawSectionHeader(doc, M, y, "Risk signals");
  y += 14;

  // Cross-Metric Risks (red bordered callouts — most important)
  if (snap.interaction_insights.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setHex(doc, COLOR.redText, "text");
    doc.text("\u26A1  CROSS-METRIC RISKS", M, y);
    y += 12;

    for (const insight of snap.interaction_insights.slice(0, 3)) {
      if (y > PH - 110) break;
      const lines = doc.splitTextToSize(insight.message, CW - 28);
      const calloutH = 8 + lines.length * 11 + 8;

      setHex(doc, "#1F0A0A", "fill");
      doc.rect(M, y, CW, calloutH, "F");
      setHex(doc, "#7F1D1D", "draw");
      doc.setLineWidth(0.5);
      doc.rect(M, y, CW, calloutH, "S");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      setHex(doc, COLOR.textBody, "text");
      lines.forEach((line: string, i: number) => {
        doc.text(line, M + 14, y + 16 + i * 11);
      });

      y += calloutH + 6;
    }
    y += 6;
  }

  // Single-Metric Flags
  if (snap.risk_flags.length > 0 && y < PH - 100) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setHex(doc, COLOR.amberText, "text");
    doc.text("SINGLE-METRIC FLAGS", M, y);
    y += 12;

    for (const flag of snap.risk_flags.slice(0, 4)) {
      if (y > PH - 90) break;
      const lines = doc.splitTextToSize(flag.message, CW - 24);

      const bulletColor =
        flag.severity === "high"     ? COLOR.red
        : flag.severity === "medium" ? COLOR.amber
        :                              COLOR.textMuted;
      setHex(doc, bulletColor, "fill");
      doc.circle(M + 4, y + 5, 1.8, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      setHex(doc, COLOR.textBody, "text");
      lines.forEach((line: string, i: number) => {
        doc.text(line, M + 12, y + 8 + i * 11);
      });
      y += lines.length * 11 + 4;
    }
    y += 6;
  }

  // Strengths
  if (snap.strengths.length > 0 && y < PH - 90) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setHex(doc, COLOR.emeraldText, "text");
    doc.text("STRENGTHS", M, y);
    y += 12;

    for (const strength of snap.strengths.slice(0, 3)) {
      if (y > PH - 80) break;
      const lines = doc.splitTextToSize(strength.message, CW - 24);

      setHex(doc, COLOR.emerald, "fill");
      doc.circle(M + 4, y + 5, 1.8, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      setHex(doc, COLOR.textBody, "text");
      lines.forEach((line: string, i: number) => {
        doc.text(line, M + 12, y + 8 + i * 11);
      });
      y += lines.length * 11 + 4;
    }
    y += 6;
  }

  // ─── SECTION 4 — What This Means (interpretation) ────────────────────
  // No "AI" labeling per spec; section title is descriptive.
  if (data.interpretation && data.interpretation.length > 0 && y < PH - 100) {
    drawSectionHeader(doc, M, y, "What this means");
    y += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setHex(doc, COLOR.textBody, "text");

    for (const sentence of data.interpretation) {
      if (y > PH - 60) break;
      const lines = doc.splitTextToSize(sentence, CW);
      lines.forEach((line: string) => {
        doc.text(line, M, y);
        y += 12;
      });
      y += 4;
    }
  }
}

// ─── Main entry: generatePDF() ──────────────────────────────────────────

export async function generateDealReportPDF(data: DealReportData): Promise<Buffer> {
  const decision = data.decision ?? computeDecisionLayer(data.inputs);

  const doc = new jsPDF({
    orientation: "portrait",
    unit:        "pt",
    format:      "letter",
  });

  drawPage1(doc, data, decision);
  drawPage2(doc, data, decision);
  drawPage3(doc, data, decision);
  drawPage4(doc, data, decision);
  drawPage5(doc, data, decision);

  // Pages 6-7 render only when caller supplied a benchmark snapshot
  if (data.benchmarkSnapshot) {
    drawPage6(doc, data, decision);
    drawPage7(doc, data, decision);
  }

  // Return as Node Buffer for the API route to stream
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

// ─── Browser-side variant: triggers download in client ──────────────────

export async function downloadDealReportPDF(data: DealReportData, filename?: string): Promise<void> {
  const decision = data.decision ?? computeDecisionLayer(data.inputs);

  const doc = new jsPDF({
    orientation: "portrait",
    unit:        "pt",
    format:      "letter",
  });

  drawPage1(doc, data, decision);
  drawPage2(doc, data, decision);
  drawPage3(doc, data, decision);
  drawPage4(doc, data, decision);
  drawPage5(doc, data, decision);

  // Pages 6-7 render only when caller supplied a benchmark snapshot
  if (data.benchmarkSnapshot) {
    drawPage6(doc, data, decision);
    drawPage7(doc, data, decision);
  }

  const fname = filename ?? `AcquiFlow-Deal-Report-${data.inputs.industry_label?.replace(/\s+/g, "-") ?? "Deal"}-${data.generated_at.toISOString().split("T")[0]}.pdf`;
  doc.save(fname);
}
