// =====================================================================
// AcquiFlow — Deal Report Generator (jsPDF)
// ---------------------------------------------------------------------
// Generates an institutional-grade PDF deal report (5, 7, or 8 pages).
//
// Core pages (always rendered):
//   1. Executive Snapshot   — IC cover-sheet framing
//   2. Financial Underwriting — SDE normalization, debt, DSCR stress
//   3. Risk Analysis        — severity-tagged flags, deal trajectory
//   4. Market Benchmarking  — percentile bar, pricing insight, comps
//   5. Recommendation       — verdict, walk-away, sequenced actions
//
// Optional pages (rendered only when benchmarkSnapshot is provided):
//   6. Financial Quality & Benchmark Risk
//        — score snapshot, internal consistency, normalization sensitivity
//   7. Deal Structure & Credit Committee Review
//        — capital structure, sources & uses, committee concerns,
//          diligence priorities (deterministic + Sonnet)
//
// Optional page (rendered only when committeeProse is also provided):
//   8. Investment Committee Summary
//        — five-section structured prose memo, Sonnet 4.6
//
// Design language (v3 institutional refresh):
//   - Light/white background; charcoal text; slate secondary; deep navy accent
//   - Top header rule replaces the left spine (less "tool output" feel)
//   - Borders/boxes used sparingly — whitespace and dividers do most work
//   - 5-level typography hierarchy applied consistently
//   - Spacing tokens (xs/sm/md/lg/xl) replace ad-hoc pixel values
//   - Goal: lower-middle-market PE / credit committee memo aesthetic
//
// Pattern: jsPDF, letter portrait, manual y-cursor positioning.
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
} from "@/lib/acquiflow/decision-layer";

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

// ─── Committee memo prose shape (optional input for page 8) ─────────────
//
// Returned by the Sonnet 4.6 committee call in the API route. Optional —
// when present, page 8 renders. When absent, the report stays at 7 pages
// (or 5 if no snapshot either).
//
// All numeric tokens in these strings are validated against the snapshot
// before this object reaches the report. If validation failed, the route
// passes undefined and page 8 is silently skipped.

export interface CommitteeMemoSection {
  lead:       string;   // 1 sentence — strongest single claim
  body:       string;   // 2-3 sentences supporting paragraph
  pull_quote: string;   // 6-9 words, no period — visually highlighted
}

export interface CommitteeMemoProse {
  /** 2-3 sentences for Page 6's normalization sensitivity card. May be null. */
  page6_normalization_interpretation: string | null;
  /** 0-2 additional diligence priority items appended to the deterministic core. */
  page7_diligence_additions: string[];
  /** Five-section investment committee memo for Page 8. */
  page8_memo: {
    investment_merits:        CommitteeMemoSection;
    primary_risks:            CommitteeMemoSection;
    financing_outlook:        CommitteeMemoSection;
    negotiation_leverage:     CommitteeMemoSection;
    recommended_path_forward: CommitteeMemoSection;
  };
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
  // Optional pre-fetched committee prose from Sonnet 4.6 — gates page 8
  // and supplies the normalization interpretation on page 6
  committeeProse?: CommitteeMemoProse;
}

// ─── Color palette (canonical, used throughout) ─────────────────────────

// ═════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM — institutional memo / lender package aesthetic
// ─────────────────────────────────────────────────────────────────────────
// Palette: charcoal + slate + deep navy. White background. Single accent.
// Typography: 5-level hierarchy. Spacing: token-based. Borders: minimal.
//
// The color names below are KEPT IDENTICAL to the previous palette so all
// existing drawPage calls continue to compile. Each name is remapped to its
// new institutional value (e.g. COLOR.indigo is no longer indigo — it's the
// navy accent that REPLACES indigo). This avoids touching ~600 callsites.
// ═════════════════════════════════════════════════════════════════════════

const COLOR = {
  // Backgrounds
  bg:           "#FFFFFF",   // white paper
  bgSubtle:     "#F8FAFC",   // very faint slate fill (used sparingly for callouts)
  bgKey:        "#F1F5F9",   // slightly stronger fill for key stat zones

  // Text — five-level hierarchy
  textPrimary:  "#0F172A",   // L1/L2 — charcoal-black, page titles & headlines
  textBody:     "#1E293B",   // L3/L4 — body prose, lead sentences
  textMuted:    "#475569",   // L5 — secondary, supporting metadata
  textDim:      "#64748B",   // labels, captions, axis text
  textFaint:    "#94A3B8",   // de-emphasized references

  // Borders (used very sparingly — whitespace does most of the work)
  borderSoft:   "#E2E8F0",   // hairline divider — most common separator
  borderHairline: "#CBD5E1", // slightly stronger when needed for emphasis

  // Accent — single deep navy used for spine rule, headers, key callouts
  // Mapped to the OLD "indigo" key so existing code keeps compiling.
  indigo:       "#1E3A8A",   // deep navy — the only saturated accent

  // Status colors — muted, print-friendly variants
  emerald:      "#047857",   // ok / strong — deep emerald (was bright #10B981)
  amber:        "#B45309",   // caution — deep amber (was bright #F59E0B)
  orange:       "#C2410C",   // moderate risk
  red:          "#B91C1C",   // risk / breach (was bright #EF4444)

  // Soft-fill backgrounds for status callouts (very subtle on white)
  emeraldDark:  "#ECFDF5",   // light emerald wash
  redDark:      "#FEF2F2",   // light red wash

  // Status text colors (used inside pills/badges)
  amberText:    "#92400E",   // dark amber for text-on-light-amber
  orangeText:   "#9A3412",
  redText:      "#991B1B",
  emeraldText:  "#065F46",
};

const setHex = (doc: jsPDF, hex: string, kind: "fill" | "draw" | "text") => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (kind === "fill") doc.setFillColor(r, g, b);
  if (kind === "draw") doc.setDrawColor(r, g, b);
  if (kind === "text") doc.setTextColor(r, g, b);
};

// ─── Spacing tokens ─────────────────────────────────────────────────────
// All vertical/horizontal gaps reference these to maintain rhythm.
// xs/sm/md/lg/xl is roughly a 4/8/16/24/40 pt scale.

const SP = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const;

// ─── Typography helpers ─────────────────────────────────────────────────
// Unified Helvetica hierarchy. Use these levels everywhere — no off-scale
// font sizes, no Courier, no ad-hoc setFontSize calls outside of these.
//
// Document-level levels:
//   L1: page title          — Helvetica bold 16
//   L2: section header      — Helvetica bold 9   (uppercase, navy)
//   L3: lead sentence       — Helvetica bold 11
//   L4: body prose          — Helvetica normal 10
//   L5: muted/metadata      — Helvetica normal 8
//
// Specialized levels:
//   eyebrow:       Helvetica bold 7.5  (small navy uppercase tag)
//   label:         Helvetica bold 7    (all-caps tiny label above values)
//   stat-medium:   Helvetica bold 14   (metric-strip values)
//   stat-large:    Helvetica bold 28   (Page 6 score)
//   hero-primary:  Helvetica bold 20   (Page 1 recommendation)
//   hero-secondary:Helvetica bold 16   (Page 1 target range)

type TypeLevel =
  | "L1" | "L2" | "L3" | "L4" | "L5"
  | "eyebrow" | "label"
  | "stat-medium" | "stat-large"
  | "hero-primary" | "hero-secondary";

function setType(doc: jsPDF, level: TypeLevel): void {
  switch (level) {
    case "L1":             doc.setFont("helvetica", "bold");   doc.setFontSize(16);  break;
    case "L2":             doc.setFont("helvetica", "bold");   doc.setFontSize(9);   break;
    case "L3":             doc.setFont("helvetica", "bold");   doc.setFontSize(11);  break;
    case "L4":             doc.setFont("helvetica", "normal"); doc.setFontSize(10);  break;
    case "L5":             doc.setFont("helvetica", "normal"); doc.setFontSize(8);   break;
    case "eyebrow":        doc.setFont("helvetica", "bold");   doc.setFontSize(7.5); break;
    case "label":          doc.setFont("helvetica", "bold");   doc.setFontSize(7);   break;
    case "stat-medium":    doc.setFont("helvetica", "bold");   doc.setFontSize(14);  break;
    case "stat-large":     doc.setFont("helvetica", "bold");   doc.setFontSize(28);  break;
    case "hero-primary":   doc.setFont("helvetica", "bold");   doc.setFontSize(20);  break;
    case "hero-secondary": doc.setFont("helvetica", "bold");   doc.setFontSize(16);  break;
  }
}

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
//
// Status colors mapped to muted institutional variants. Pills use a faint
// fill + readable dark text. No more saturated dark-mode bgs.

const STATUS_COLOR_MAP = {
  red:    { fill: "#FEF2F2", stroke: "#FCA5A5", text: "#991B1B" },
  yellow: { fill: "#FFFBEB", stroke: "#FCD34D", text: "#92400E" },
  blue:   { fill: "#EFF6FF", stroke: "#BFDBFE", text: "#1E3A8A" },
  green:  { fill: "#ECFDF5", stroke: "#A7F3D0", text: "#065F46" },
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
    return { label: "Not Meaningful", bg: "#F8FAFC", text: "#64748B" };
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
  return { label: "\u2014", bg: "#F8FAFC", text: "#94A3B8" };
}

// ─── Layout constants (Letter portrait) ─────────────────────────────────

const PW = 612;   // page width  in pt
const PH = 792;   // page height in pt
const M  = 36;    // outer margin (will widen to 54 in a later commit once layouts adjust)
const CW = PW - M * 2;
// SPINE_W intentionally removed; replaced by top header rule.

// ─── Page chrome (header + footer) ──────────────────────────────────────
//
// New header treatment:
//   - No left spine
//   - Thin charcoal rule at top of page (full-width minus margins)
//   - Page identifier in small-caps on left, page number on right
//   - Subtle bottom rule mirrors top rule for visual containment

function newPage(doc: jsPDF, pageNum: number, pageLabel: string, isFirst = false): void {
  if (!isFirst) doc.addPage();

  // White paper background
  setHex(doc, COLOR.bg, "fill");
  doc.rect(0, 0, PW, PH, "F");

  // ─── Top header band ────────────────────────────────────────────────
  // Brand wordmark on the left, page label on the right, separated by a
  // thin charcoal rule. The rule is the only visible separator — no spine,
  // no boxes around the header, no decorative elements.

  // Brand wordmark (charcoal, no period accent — restraint)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setHex(doc, COLOR.textPrimary, "text");
  doc.text("ACQUIFLOW", M, 38);

  // Page label, right-aligned, small caps style via uppercase
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setHex(doc, COLOR.textDim, "text");
  doc.text(pageLabel.toUpperCase(), PW - M, 38, { align: "right" });

  // Top rule — full content width, deep navy, hairline weight
  setHex(doc, COLOR.indigo, "draw");
  doc.setLineWidth(0.6);
  doc.line(M, 46, PW - M, 46);

  // ─── Footer ──────────────────────────────────────────────────────────
  // Mirror rule + minimal text. Page number right, brand left.

  setHex(doc, COLOR.borderSoft, "draw");
  doc.setLineWidth(0.4);
  doc.line(M, PH - 36, PW - M, PH - 36);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setHex(doc, COLOR.textFaint, "text");
  doc.text("acquiflow.io", M, PH - 22);
  doc.text(`Page ${pageNum}`, PW - M, PH - 22, { align: "right" });
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
  setHex(doc, "#F8FAFC", "fill");
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
  doc.setFont("helvetica", "bold");
  doc.setFontSize(valueSize);
  setHex(doc, valueColor, "text");
  doc.text(value, x + 7, y + 24);
}

function drawSectionHeader(doc: jsPDF, x: number, y: number, label: string): void {
  // Small navy mark + uppercase label. Restrained, editorial.
  // The mark is 8pt wide, 0.5pt tall — almost a tick.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "fill");
  doc.rect(x, y - 4, 8, 0.5, "F");
  setHex(doc, COLOR.indigo, "text");
  doc.text(label.toUpperCase(), x + 12, y);
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

  // ─── EYEBROW ─────────────────────────────────────────────────────────
  setType(doc, "eyebrow");
  setHex(doc, COLOR.indigo, "text");
  doc.text("EXECUTIVE SNAPSHOT", M, y);
  y += SP.md;

  // ─── DEAL TITLE ──────────────────────────────────────────────────────
  setType(doc, "L1");
  setHex(doc, COLOR.textPrimary, "text");
  doc.text(inputs.industry_label || "Untitled Deal", M, y);
  y += SP.md - 2;

  // ─── SUBTITLE ────────────────────────────────────────────────────────
  const locParts = [inputs.city, inputs.state].filter(Boolean).join(", ");
  const subtitleParts = [
    locParts || null,
    `Generated ${data.generated_at.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
  ].filter(Boolean);
  setType(doc, "L5");
  setHex(doc, COLOR.textMuted, "text");
  doc.text(subtitleParts.join(" \u00B7 "), M, y);
  y += SP.xl;

  // ─── HERO BLOCK ──────────────────────────────────────────────────────
  // Two anchors: RECOMMENDATION (left, hero-primary 20pt) and
  // TARGET PRICE (right, hero-secondary 16pt). Both Helvetica bold.
  // No fill, no border — typography carries the weight.
  // Restraint: this is a memo cover, not a presentation slide.
  const recColor =
    decision.recommendation === "PURSUE"      ? COLOR.emerald :
    decision.recommendation === "INVESTIGATE" ? COLOR.amber :
    decision.recommendation === "RESTRUCTURE" ? COLOR.orange :
                                                 COLOR.red;

  // Left anchor: RECOMMENDATION
  setType(doc, "label");
  setHex(doc, COLOR.textDim, "text");
  doc.text("RECOMMENDATION", M, y);

  setType(doc, "hero-primary");
  setHex(doc, recColor, "text");
  doc.text(decision.recommendation, M, y + 22);

  // Right anchor: TARGET PRICE
  const rightX = M + CW / 2 + SP.sm;
  setType(doc, "label");
  setHex(doc, COLOR.textDim, "text");
  doc.text("TARGET PRICE", rightX, y);

  setType(doc, "hero-secondary");
  setHex(doc, COLOR.textPrimary, "text");
  const targetRange = `${fmtUsd(decision.target_price_low)}–${fmtUsd(decision.target_price_high)}`;
  doc.text(targetRange, rightX, y + 22);

  y += SP.xl;

  // ─── HERO METADATA STRIP ─────────────────────────────────────────────
  // Score + Confidence + Leverage + Lender Ready as quiet inline metadata.
  // Visually subordinate to the hero — slate, single line, comma-separated.
  const lenderReadyDisplay = decision.lender_readiness === "FAIL" ? "Fail"
    : decision.lender_readiness === "CONDITIONAL" ? "Conditional"
    : "Pass";

  setType(doc, "L5");
  setHex(doc, COLOR.textMuted, "text");
  const metaParts = [
    `Score ${inputs.overall_score}/100`,
    `${decision.confidence} confidence`,
    `${decision.leverage.toLowerCase().replace(/^\w/, c => c.toUpperCase())} leverage`,
    `Lender ${lenderReadyDisplay.toLowerCase()}`,
  ];
  doc.text(metaParts.join("   \u00B7   "), M, y);
  y += SP.lg;

  // ─── VERDICT SUBLINE ─────────────────────────────────────────────────
  // Single line of supporting context. Italic charcoal — the thesis sentence.
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  setHex(doc, COLOR.textBody, "text");
  doc.text(verdictSubline(decision), M, y);
  y += SP.xl;

  // ─── HAIRLINE DIVIDER ────────────────────────────────────────────────
  setHex(doc, COLOR.borderSoft, "draw");
  doc.setLineWidth(0.4);
  doc.line(M, y, M + CW, y);
  y += SP.xl;

  // ─── KEY METRICS ─────────────────────────────────────────────────────
  // Quiet 4-column grid, no cell borders or fills. Labels above values.
  setType(doc, "eyebrow");
  setHex(doc, COLOR.indigo, "text");
  doc.text("KEY METRICS", M, y);
  y += SP.md;

  const cellsPerRow = 4;
  const cellW = CW / cellsPerRow;
  const askGapPct = inputs.fair_value > 0
    ? round(((inputs.asking_price - inputs.fair_value) / inputs.fair_value) * 100, 1)
    : 0;

  const renderMetricRow = (
    cells: [string, string, string][],
    rowY: number,
  ): void => {
    cells.forEach((cell, i) => {
      const cx = M + i * cellW;
      // Tiny uppercase label
      setType(doc, "label");
      setHex(doc, COLOR.textDim, "text");
      doc.text(cell[0].toUpperCase(), cx, rowY);
      // Stat-medium value below
      setType(doc, "stat-medium");
      setHex(doc, cell[2], "text");
      doc.text(cell[1], cx, rowY + 16);
    });
  };

  const row1: [string, string, string][] = [
    ["Asking",        fmtUsd(inputs.asking_price),                                       COLOR.textPrimary],
    ["Adj. SDE",      fmtUsd(inputs.usable_sde ?? inputs.sde),                          COLOR.textPrimary],
    ["Multiple",      `${inputs.valuation_multiple.toFixed(2)}x`,                       COLOR.textPrimary],
    ["DSCR",          `${inputs.dscr.toFixed(2)}x`, inputs.dscr >= 1.5 ? COLOR.emerald : inputs.dscr >= 1.25 ? COLOR.amber : COLOR.red],
  ];
  renderMetricRow(row1, y);
  y += SP.xl;

  const row2: [string, string, string][] = [
    ["Fair value",     fmtUsd(inputs.fair_value),                                           askGapPct < 0 ? COLOR.emerald : COLOR.textPrimary],
    ["Valuation gap",  fmtPct(askGapPct),                                                   askGapPct < 0 ? COLOR.emerald : askGapPct > 15 ? COLOR.red : COLOR.textPrimary],
    ["Percentile",     decision.pricing_insight.percentile_ordinal,                        COLOR.textPrimary],
    ["Risk level",     inputs.risk_level,                                                    riskLevelColor(inputs.risk_level)],
  ];
  renderMetricRow(row2, y);
  y += SP.xl;

  // ─── HAIRLINE DIVIDER ────────────────────────────────────────────────
  setHex(doc, COLOR.borderSoft, "draw");
  doc.setLineWidth(0.4);
  doc.line(M, y, M + CW, y);
  y += SP.xl;

  // ─── NEGOTIATION POSTURE ─────────────────────────────────────────────
  setType(doc, "eyebrow");
  setHex(doc, COLOR.indigo, "text");
  doc.text("NEGOTIATION POSTURE", M, y);
  y += SP.md - 2;

  // Navy left edge, no fill, no surrounding box.
  // CRITICAL: set the draw font BEFORE splitTextToSize, otherwise lines wrap
  // against the previously-set font (eyebrow bold 7.5pt) and overflow when
  // drawn at italic 10pt.
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  const postureLines = doc.splitTextToSize(data.posture, CW - 16);
  const postureLineHeight = 13;
  const postureBlockH = postureLines.length * postureLineHeight + 4;

  setHex(doc, COLOR.indigo, "fill");
  doc.rect(M, y - 6, 2, postureBlockH, "F");

  setHex(doc, COLOR.textBody, "text");
  postureLines.forEach((line: string, i: number) => {
    doc.text(line, M + 12, y + 4 + i * postureLineHeight);
  });
  y += postureBlockH + SP.xl;

  // ─── INVESTMENT TAKE ─────────────────────────────────────────────────
  setType(doc, "eyebrow");
  setHex(doc, COLOR.indigo, "text");
  doc.text("INVESTMENT TAKE", M, y);
  y += SP.md;

  setType(doc, "L4");
  setHex(doc, COLOR.textBody, "text");
  const take = buildInvestmentTake(decision, inputs);
  const takeLines = doc.splitTextToSize(take, CW);
  takeLines.forEach((line: string, i: number) => {
    doc.text(line, M, y + i * 13);
  });
}

// ─── PAGE 2 — FINANCIAL UNDERWRITING ────────────────────────────────────

function drawPage2(doc: jsPDF, data: DealReportData, decision: DecisionLayerResult): void {
  newPage(doc, 2, "Financial Underwriting");
  const { inputs } = data;

  let y = 78;

  // ─── Eyebrow + page title (page-8 voice) ─────────────────────────────
  setType(doc, "eyebrow");
  setHex(doc, COLOR.indigo, "text");
  doc.text("FINANCIAL UNDERWRITING", M, y);
  y += 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  setHex(doc, COLOR.textPrimary, "text");
  doc.text("Earnings normalization and debt structure", M, y);
  y += 14;

  setType(doc, "L4");
  setHex(doc, COLOR.textMuted, "text");
  doc.text(
    "Reconstructs true earnings and tests debt capacity under realistic downside scenarios.",
    M, y,
  );
  y += SP.xl;

  // ───────────────────────────────────────────────────────────────────────
  // SECTION 1 — SDE normalization
  // When no normalization haircuts apply (the common case), collapse the
  // table to a single italic prose line. When haircuts exist, render the
  // table — but with restraint, no header rules, hairline-only dividers.
  // ───────────────────────────────────────────────────────────────────────

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  doc.text("SDE NORMALIZATION", M, y);
  y += 16;

  const reported = inputs.reported_sde ?? inputs.sde;
  const usable   = inputs.usable_sde   ?? inputs.sde;
  const totalAdj = reported - usable;

  if (totalAdj <= 0) {
    // No haircuts — render as inline prose, properly wrapped within CW.
    // (Set the L4 font BEFORE splitTextToSize — same lesson learned from
    // the Page 1 clipping bug.)
    setType(doc, "L4");
    setHex(doc, COLOR.textBody, "text");
    const sdeProse = `Adjusted SDE matches the reported figure of ${fmtUsd(reported)}. No normalization haircuts applied — financials warrant validation through tax returns during diligence regardless.`;
    const sdeLines = doc.splitTextToSize(sdeProse, CW);
    sdeLines.slice(0, 3).forEach((line: string, i: number) => {
      doc.text(line, M, y + i * 13);
    });
    y += Math.min(sdeLines.length, 3) * 13 + SP.xl;
  } else {
    // Haircuts present — render the comparison table
    const colX = [M, M + 230, M + 340, M + 460];
    setType(doc, "label");
    setHex(doc, COLOR.textDim, "text");
    doc.text("COMPONENT", colX[0], y);
    doc.text("REPORTED",  colX[1], y);
    doc.text("ADJUSTED",  colX[2], y);
    doc.text("DELTA",     colX[3], y);
    y += SP.sm + 4;
    setHex(doc, COLOR.borderSoft, "draw");
    doc.setLineWidth(0.3);
    doc.line(M, y, M + CW, y);
    y += SP.sm + 4;

    setType(doc, "L4");
    setHex(doc, COLOR.textBody, "text");
    doc.text("Seller-reported SDE", colX[0], y);
    doc.text(fmtUsd(reported), colX[1], y);
    doc.text("—", colX[2], y);
    doc.text("—", colX[3], y);
    y += 18;

    const pctOfReported = (totalAdj / reported) * 100;
    doc.text("Normalization adjustments", colX[0], y);
    doc.text("—", colX[1], y);
    setHex(doc, COLOR.amberText, "text");
    doc.text(`-${fmtUsd(totalAdj)}`, colX[2], y);
    doc.text(fmtPct(-pctOfReported), colX[3], y);
    y += 18;

    setHex(doc, COLOR.borderSoft, "draw");
    doc.setLineWidth(0.3);
    doc.line(M, y - 6, M + CW, y - 6);

    doc.setFont("helvetica", "bold");
    setHex(doc, COLOR.textPrimary, "text");
    doc.text("Adjusted SDE (used in analysis)", colX[0], y);
    setHex(doc, COLOR.indigo, "text");
    doc.text(fmtUsd(usable), colX[2], y);
    doc.text(fmtPct(((usable - reported) / reported) * 100), colX[3], y);
    y += SP.lg;

    // SDE interpretation in editorial style
    if (decision.sde_interpretation) {
      setType(doc, "label");
      setHex(doc, COLOR.textDim, "text");
      doc.text("INTERPRETATION", M, y);
      y += SP.sm + 4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      setHex(doc, COLOR.textBody, "text");
      const lines = doc.splitTextToSize(decision.sde_interpretation, CW);
      lines.slice(0, 3).forEach((line: string, i: number) => {
        doc.text(line, M, y + i * 13);
      });
      y += Math.min(lines.length, 3) * 13 + SP.xl;
    } else {
      y += SP.md;
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // SECTION 2 — Debt structure assumption
  // Asymmetric: Loan size + Annual debt are the primary anchors (larger).
  // Down payment + Rate/Term are secondary (smaller, slate). No equal-weight
  // 4-tile UI grid.
  // ───────────────────────────────────────────────────────────────────────

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  doc.text("DEBT STRUCTURE ASSUMPTION", M, y);
  y += 18;

  const debtPct  = inputs.debt_percent  ?? 90;
  const interest = inputs.interest_rate ?? 10.75;
  const term     = inputs.term_years    ?? 10;
  const loanAmt  = inputs.asking_price * (debtPct / 100);
  const downAmt  = inputs.asking_price - loanAmt;
  const monthly  = inputs.monthly_payment ?? estimateMonthly(loanAmt, interest, term);
  const annual   = monthly * 12;

  // Two primary anchors on the left half, two secondary on the right
  const leftHalfX = M;
  const rightHalfX = M + CW / 2 + SP.sm;

  // Primary left: Loan size
  setType(doc, "label");
  setHex(doc, COLOR.textDim, "text");
  doc.text("LOAN SIZE", leftHalfX, y);
  setType(doc, "stat-medium");
  setHex(doc, COLOR.textPrimary, "text");
  doc.text(fmtUsd(loanAmt), leftHalfX, y + 18);

  // Primary right: Annual debt service
  setType(doc, "label");
  setHex(doc, COLOR.textDim, "text");
  doc.text("ANNUAL DEBT SERVICE", rightHalfX, y);
  setType(doc, "stat-medium");
  setHex(doc, COLOR.textPrimary, "text");
  doc.text(fmtUsd(annual), rightHalfX, y + 18);

  y += 36;

  // Secondary metadata strip — slate, single line
  setType(doc, "L5");
  setHex(doc, COLOR.textMuted, "text");
  const debtMetaParts = [
    `Down payment ${fmtUsd(downAmt)} (${(100 - debtPct).toFixed(0)}%)`,
    `Rate ${interest.toFixed(2)}%`,
    `Term ${term}y`,
  ];
  doc.text(debtMetaParts.join("   \u00B7   "), M, y);
  y += SP.xl;

  // ───────────────────────────────────────────────────────────────────────
  // SECTION 3 — DSCR stress scenarios
  // Clean table with restrained dividers, generous spacing.
  // ───────────────────────────────────────────────────────────────────────

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  doc.text("DSCR STRESS SCENARIOS", M, y);
  y += 16;

  const sCols = [M, M + 250, M + 350, M + 440];
  setType(doc, "label");
  setHex(doc, COLOR.textDim, "text");
  doc.text("SCENARIO", sCols[0], y);
  doc.text("SDE",      sCols[1], y);
  doc.text("DSCR",     sCols[2], y);
  doc.text("STATUS",   sCols[3], y);
  y += SP.sm + 4;
  setHex(doc, COLOR.borderSoft, "draw");
  doc.setLineWidth(0.3);
  doc.line(M, y, M + CW, y);
  y += SP.sm + 4;

  setType(doc, "L4");
  decision.stress_scenarios.forEach((s) => {
    const dscrColor = s.comfortable ? COLOR.emerald : s.passed ? COLOR.amber : COLOR.red;
    const statusLabel = s.passed ? "PASS" : "FAIL";

    doc.setFont("helvetica", "normal");
    setHex(doc, COLOR.textBody, "text");
    doc.text(s.label, sCols[0], y);
    doc.text(fmtUsd(s.sde), sCols[1], y);

    setHex(doc, dscrColor, "text");
    doc.text(`${s.dscr.toFixed(2)}x`, sCols[2], y);

    doc.setFont("helvetica", "bold");
    doc.text(statusLabel, sCols[3], y);

    y += 18;
    setHex(doc, COLOR.borderSoft, "draw");
    doc.setLineWidth(0.3);
    doc.line(M, y - 6, M + CW, y - 6);
  });
  y += SP.lg;

  // DSCR interpretation in editorial style
  if (decision.dscr_interpretation) {
    setType(doc, "label");
    setHex(doc, COLOR.textDim, "text");
    doc.text("INTERPRETATION", M, y);
    y += SP.sm + 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setHex(doc, COLOR.textBody, "text");
    const lines = doc.splitTextToSize(decision.dscr_interpretation, CW);
    lines.slice(0, 4).forEach((line: string, i: number) => {
      doc.text(line, M, y + i * 13);
    });
  }
}

// ─── PAGE 3 — RISK ANALYSIS ─────────────────────────────────────────────

function drawPage3(doc: jsPDF, data: DealReportData, decision: DecisionLayerResult): void {
  newPage(doc, 3, "Risk Analysis");

  let y = 78;

  // ─── Eyebrow + page title (page-8 voice) ─────────────────────────────
  setType(doc, "eyebrow");
  setHex(doc, COLOR.indigo, "text");
  doc.text("RISK ANALYSIS", M, y);
  y += 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  setHex(doc, COLOR.textPrimary, "text");
  doc.text("Risk severity and deal trajectory", M, y);
  y += 14;

  setType(doc, "L4");
  setHex(doc, COLOR.textMuted, "text");
  doc.text("Risks ranked by impact severity — High, Medium, Low.", M, y);
  y += SP.xl;

  // ───────────────────────────────────────────────────────────────────────
  // SECTION 1 — Risk flags by severity
  // Stripe + headline + body. Generous inter-row spacing — each flag
  // reads as its own observation rather than a row in a table.
  // ───────────────────────────────────────────────────────────────────────

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  doc.text("RISK FLAGS BY SEVERITY", M, y);
  y += 18;

  const flagsToShow = decision.risk_flags.slice(0, 6);
  flagsToShow.forEach((flag) => {
    if (y > PH - 200) return;
    y = drawRiskFlag(doc, M, y, CW, flag);
    y += SP.md;  // generous breathing between flags (was SP.xs+2)
  });
  y += SP.md;

  // ───────────────────────────────────────────────────────────────────────
  // SECTION 2 — Deal trajectory
  // Editorial inline block — single declarative line + secondary metadata
  // strip. Replaces the previous 2-row dashboard tile with header strip.
  // ───────────────────────────────────────────────────────────────────────

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  doc.text("DEAL TRAJECTORY", M, y);
  y += 18;

  const trendColor = decision.trajectory_label === "Improving" ? COLOR.emerald :
                     decision.trajectory_label === "Declining" ? COLOR.red :
                     decision.trajectory_label === "Stable"    ? COLOR.emerald : COLOR.textMuted;
  const trendLabel = (decision.trajectory_label ?? "Unknown").toLowerCase();
  const confidenceLabel = (decision.trajectory_confidence ?? "Unknown").toLowerCase();

  // Lead sentence — bold L3 with the trend label color-keyed.
  // Build width-aware so the colored portion sits inline.
  setType(doc, "L3");
  setHex(doc, COLOR.textPrimary, "text");
  const leadPart1 = "Trajectory reads as";
  doc.text(leadPart1, M, y);
  const part1W = doc.getTextWidth(leadPart1) + 4;  // explicit gap

  setHex(doc, trendColor, "text");
  const trendLabelText = decision.trajectory_label ?? "Unknown";
  doc.text(trendLabelText, M + part1W, y);
  const trendW = doc.getTextWidth(trendLabelText) + 4;

  setHex(doc, COLOR.textPrimary, "text");
  doc.text(`with ${confidenceLabel} confidence.`, M + part1W + trendW, y);
  y += SP.md;

  // Secondary metadata strip — slate, single line
  const sdeMargin = data.inputs.revenue > 0
    ? `${((data.inputs.sde / data.inputs.revenue) * 100).toFixed(0)}%`
    : "—";
  const churn = data.inputs.evidence_profile?.concentrationBand === "high" ? "elevated" : "typical";
  setType(doc, "L5");
  setHex(doc, COLOR.textMuted, "text");
  const trajParts = [
    `Y/Y revenue stable`,
    `SDE margin ${sdeMargin}`,
    `Customer churn ${churn}`,
  ];
  doc.text(trajParts.join("   \u00B7   "), M, y);
}

function drawRiskFlag(doc: jsPDF, x: number, y: number, w: number, flag: RiskFlag): number {
  // Severity-driven palette. Background fill REMOVED — only the left stripe
  // and badge text carry the semantic color. Cleaner, less dashboard-y.
  const palette = flag.severity === "HIGH"   ? { stripe: COLOR.red,    text: COLOR.redText,    badgeBg: COLOR.red,    badgeText: "#FFFFFF" } :
                  flag.severity === "MEDIUM" ? { stripe: COLOR.orange, text: COLOR.orangeText, badgeBg: COLOR.orange, badgeText: "#FFFFFF" } :
                                                { stripe: COLOR.amber,  text: COLOR.amberText,  badgeBg: COLOR.amber,  badgeText: "#FFFFFF" };

  // Compute height based on detail wrapping
  setType(doc, "L4");
  const detailLines = doc.splitTextToSize(flag.detail, w - 16);
  const baseH = 22;
  const detailH = detailLines.length * 12;
  const h = baseH + detailH + 6;

  // Left stripe only — no fill, no surrounding box
  setHex(doc, palette.stripe, "fill");
  doc.rect(x, y, 2, h, "F");

  // Badge row
  let bx = x + 10;
  bx = drawBadge(doc, bx, y + 14, flag.severity, palette.badgeBg, palette.badgeText, 7, true, false);
  bx += 6;
  if (flag.isDealBreaker) {
    bx = drawBadge(doc, bx, y + 14, "POTENTIAL DEAL BREAKER", palette.stripe, palette.stripe, 7, true, true);
    bx += 6;
  }

  // Headline
  setType(doc, "L3");
  setHex(doc, COLOR.textPrimary, "text");
  doc.text(flag.headline, bx, y + 14);

  // Category right-aligned
  setType(doc, "label");
  doc.setFont("helvetica", "normal");
  setHex(doc, COLOR.textDim, "text");
  doc.text(flag.category, x + w, y + 14, { align: "right" });

  // Detail
  setType(doc, "L4");
  setHex(doc, COLOR.textBody, "text");
  detailLines.forEach((line: string, i: number) => {
    doc.text(line, x + 10, y + 26 + i * 12);
  });

  return y + h;
}

// ─── PAGE 4 — MARKET BENCHMARKING ───────────────────────────────────────

function drawPage4(doc: jsPDF, data: DealReportData, decision: DecisionLayerResult): void {
  newPage(doc, 4, "Market Benchmarking");
  const { inputs, comparables } = data;

  let y = 78;

  // ─── Eyebrow + page title (page-8 voice) ─────────────────────────────
  setType(doc, "eyebrow");
  setHex(doc, COLOR.indigo, "text");
  doc.text("MARKET BENCHMARKING", M, y);
  y += 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  setHex(doc, COLOR.textPrimary, "text");
  doc.text("Comparable transactions and positioning", M, y);
  y += 14;

  setType(doc, "L4");
  setHex(doc, COLOR.textMuted, "text");
  const sampleSize = inputs.benchmark_sample_size ?? 312;
  doc.text(
    `${inputs.industry_label} benchmark — ${sampleSize.toLocaleString()} transactions, proprietary AcquiFlow database.`,
    M, y,
  );
  y += SP.xl;

  // ───────────────────────────────────────────────────────────────────────
  // SECTION 1 — Asking multiple vs market range
  // Bar sits openly on the page with labels above and a stat strip below.
  // No surrounding container, no tinted fill behind it.
  // ───────────────────────────────────────────────────────────────────────

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  doc.text("ASKING MULTIPLE VS MARKET RANGE", M, y);
  y += 18;

  const benchMid  = decision.pricing_insight.median_multiple;
  const benchLow  = inputs.benchmark_low  ?? round(benchMid * 0.7, 2);
  const benchHigh = inputs.benchmark_high ?? round(benchMid * 1.4, 2);

  // Range labels — placed above the bar without a surrounding box
  setType(doc, "L5");
  setHex(doc, COLOR.textMuted, "text");
  doc.text(`Low ${benchLow.toFixed(1)}x`,    M, y);
  doc.text(`Median ${benchMid.toFixed(1)}x`, M + CW / 2, y, { align: "center" });
  doc.text(`High ${benchHigh.toFixed(1)}x`,  M + CW, y, { align: "right" });
  y += 14;

  // The bar — three quiet tinted segments
  const barX = M;
  const barY = y;
  const barW = CW;
  const barH = 6;
  const seg = barW / 3;
  setHex(doc, "#ECFDF5", "fill"); doc.rect(barX,           barY, seg, barH, "F");
  setHex(doc, "#FFFBEB", "fill"); doc.rect(barX + seg,     barY, seg, barH, "F");
  setHex(doc, "#FEF2F2", "fill"); doc.rect(barX + seg * 2, barY, seg, barH, "F");

  // Marker — narrow navy rect spanning the bar
  const askMult     = inputs.valuation_multiple;
  const askPosRatio = clamp01((askMult - benchLow) / (benchHigh - benchLow));
  const markerX     = barX + askPosRatio * barW;
  setHex(doc, COLOR.indigo, "fill");
  doc.rect(markerX - 1.5, barY - 4, 3, barH + 8, "F");

  // Median tick — thin slate
  setHex(doc, COLOR.textMuted, "draw");
  doc.setLineWidth(0.5);
  doc.line(barX + barW / 2, barY - 2, barX + barW / 2, barY + barH + 2);

  y += barH + SP.lg;

  // Stats strip below — three columns, slate labels + bold values
  const positionText  = decision.pricing_insight.position === "below" ? "Below market"
                      : decision.pricing_insight.position === "above" ? "Above market"
                      : "At market";
  const positionColor = decision.pricing_insight.position === "below" ? COLOR.emerald
                      : decision.pricing_insight.position === "above" ? COLOR.red
                      : COLOR.amber;

  const colXs = [M, M + CW / 3, M + (2 * CW) / 3];

  setType(doc, "label");
  setHex(doc, COLOR.textDim, "text");
  doc.text("THIS DEAL",   colXs[0], y);
  doc.text("PERCENTILE",  colXs[1], y);
  doc.text("POSITION",    colXs[2], y);
  y += 16;

  setType(doc, "stat-medium");
  setHex(doc, COLOR.indigo, "text");
  doc.text(`${askMult.toFixed(2)}x`, colXs[0], y);
  setHex(doc, COLOR.textPrimary, "text");
  doc.text(decision.pricing_insight.percentile_ordinal, colXs[1], y);
  setHex(doc, positionColor, "text");
  doc.text(positionText, colXs[2], y);

  y += SP.xl;

  // ───────────────────────────────────────────────────────────────────────
  // SECTION 2 — Pricing insight (editorial)
  // INTERPRETATION-eyebrow + flowing prose. No colored left edge, no fill.
  // Matches Page 6's normalization-sensitivity treatment.
  // ───────────────────────────────────────────────────────────────────────

  setType(doc, "label");
  setHex(doc, COLOR.textDim, "text");
  doc.text("PRICING INSIGHT", M, y);
  y += SP.sm + 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setHex(doc, COLOR.textBody, "text");
  const proseLines = doc.splitTextToSize(decision.pricing_insight.prose, CW);
  proseLines.slice(0, 6).forEach((line: string, i: number) => {
    doc.text(line, M, y + i * 13);
  });
  y += Math.min(proseLines.length, 6) * 13 + SP.xl;

  // ───────────────────────────────────────────────────────────────────────
  // SECTION 3 — Representative comparable transactions
  // Restrained table — column labels without underline, hairline-only
  // row dividers, generous row heights.
  // ───────────────────────────────────────────────────────────────────────

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  doc.text("REPRESENTATIVE COMPARABLE TRANSACTIONS", M, y);
  y += 18;

  const cCols = [M, M + 240, M + 320, M + 400, M + 480];
  setType(doc, "label");
  setHex(doc, COLOR.textDim, "text");
  doc.text("INDUSTRY TRANSACTION", cCols[0], y);
  doc.text("REVENUE",  cCols[1], y);
  doc.text("SDE",      cCols[2], y);
  doc.text("MULTIPLE", cCols[3], y);
  doc.text("YEAR",     cCols[4], y);
  y += SP.sm + 4;
  setHex(doc, COLOR.borderSoft, "draw");
  doc.setLineWidth(0.3);
  doc.line(M, y, M + CW, y);
  y += SP.sm + 4;

  setType(doc, "L4");
  const compsToShow = comparables.slice(0, 4);
  compsToShow.forEach((c) => {
    doc.setFont("helvetica", "normal");
    setHex(doc, COLOR.textBody, "text");
    const stateSuffix = c.state ? ` (${c.state})` : "";
    doc.text(`${c.industry_label}${stateSuffix}`, cCols[0], y);
    doc.text(fmtUsd(c.revenue), cCols[1], y);
    doc.text(fmtUsd(c.sde),     cCols[2], y);
    doc.text(`${c.multiple.toFixed(1)}x`, cCols[3], y);
    setHex(doc, COLOR.textDim, "text");
    doc.text(String(c.year), cCols[4], y);
    y += 18;
    setHex(doc, COLOR.borderSoft, "draw");
    doc.setLineWidth(0.3);
    doc.line(M, y - 6, M + CW, y - 6);
  });

  // "This deal" emphasis row — bold navy text, faint background
  setHex(doc, "#F8FAFC", "fill");
  doc.rect(M - 2, y - 4, CW + 4, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setHex(doc, COLOR.indigo, "text");
  doc.text("This deal", cCols[0], y + 6);
  doc.text(fmtUsd(inputs.revenue),                          cCols[1], y + 6);
  doc.text(fmtUsd(inputs.usable_sde ?? inputs.sde),         cCols[2], y + 6);
  doc.text(`${inputs.valuation_multiple.toFixed(2)}x`,      cCols[3], y + 6);
  doc.text(String(data.generated_at.getFullYear()),         cCols[4], y + 6);
}

// ─── PAGE 5 — RECOMMENDATION ────────────────────────────────────────────

function drawPage5(doc: jsPDF, data: DealReportData, decision: DecisionLayerResult): void {
  newPage(doc, 5, "Recommendation");

  let y = 78;

  // ─── Eyebrow + page title (page-8 voice) ─────────────────────────────
  setType(doc, "eyebrow");
  setHex(doc, COLOR.indigo, "text");
  doc.text("RECOMMENDATION & NEXT STEPS", M, y);
  y += 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  setHex(doc, COLOR.textPrimary, "text");
  doc.text("Path to LOI", M, y);
  y += 14;

  setType(doc, "L4");
  setHex(doc, COLOR.textMuted, "text");
  doc.text("Sequenced actions, pricing guidance, and walk-away discipline.", M, y);
  y += SP.xl;

  // ─── RECOMMENDATION ──────────────────────────────────────────────────
  // Editorial treatment, page-8 voice. Navy left edge anchors the finding;
  // the recommendation color appears only on the recommendation text
  // itself, not as a frame around it.
  const recColor = decision.recommendation === "PURSUE"      ? COLOR.emerald :
                   decision.recommendation === "INVESTIGATE" ? COLOR.amber :
                   decision.recommendation === "RESTRUCTURE" ? COLOR.orange : COLOR.red;

  const recBlockH = 44;
  setHex(doc, COLOR.indigo, "fill");
  doc.rect(M, y, 1.5, recBlockH, "F");

  setType(doc, "label");
  setHex(doc, COLOR.textDim, "text");
  doc.text("RECOMMENDATION", M + 12, y + 12);

  setType(doc, "hero-secondary");
  setHex(doc, recColor, "text");
  doc.text(buildRecommendationLine(decision.recommendation), M + 12, y + 32);

  y += recBlockH + SP.xl;

  // ─── WALK-AWAY THRESHOLD ──────────────────────────────────────────────
  // Editorial inline. Eyebrow + value as a stat-medium inline, then a line
  // of supporting prose. No dramatic red top rule, no right-aligned hero
  // number. The threshold reads as an underwriting finding, not a UI alert.
  setType(doc, "label");
  setHex(doc, COLOR.red, "text");
  doc.text("WALK-AWAY THRESHOLD", M, y);
  y += 16;

  // Value inline at hero-secondary (16pt), with brief framing on the same line
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  setHex(doc, COLOR.red, "text");
  const waValue = fmtUsd(decision.walk_away_threshold);
  doc.text(waValue, M, y);
  const waValueW = doc.getTextWidth(waValue);

  setType(doc, "L4");
  setHex(doc, COLOR.textMuted, "text");
  doc.text("ceiling above which the deal does not underwrite cleanly.", M + waValueW + 8, y);
  y += SP.md;

  setType(doc, "L4");
  setHex(doc, COLOR.textBody, "text");
  const waLine = `Above ${waValue}, expected return falls below acceptable risk threshold. Do not proceed without structural changes — seller note, earn-out, or revised debt terms.`;
  const waLines = doc.splitTextToSize(waLine, CW);
  waLines.slice(0, 2).forEach((line: string, i: number) => {
    doc.text(line, M, y + i * 13);
  });
  y += Math.min(waLines.length, 2) * 13 + SP.xl;

  // ─── SUGGESTED ACTIONS ────────────────────────────────────────────────
  // Memo-style numbered. Each item: numbered marker, bold lead, italic
  // muted detail. No tile chrome, no fill, no left-edge bar per item.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  doc.text("SUGGESTED ACTIONS (SEQUENCED)", M, y);
  y += 18;

  const actions = buildSuggestedActions(decision, data.inputs);
  actions.forEach((act, i) => {
    // Numbered marker — navy
    setType(doc, "L3");
    setHex(doc, COLOR.indigo, "text");
    doc.text(String(i + 1).padStart(2, "0"), M, y + 10);

    // Title — L4 bold
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setHex(doc, COLOR.textPrimary, "text");
    doc.text(act.title, M + 24, y + 10);

    // Detail — italic muted, single line
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    setHex(doc, COLOR.textMuted, "text");
    const detailLines = doc.splitTextToSize(act.detail, CW - 24);
    detailLines.slice(0, 1).forEach((line: string) => {
      doc.text(line, M + 24, y + 24);
    });

    y += 38;  // generous inter-item breathing
  });
  y += SP.md;

  // ─── WALK-AWAY TRIGGERS ───────────────────────────────────────────────
  // 2 inline observations with red eyebrows. No card grid, no fill, no rect.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  doc.text("WALK-AWAY TRIGGERS", M, y);
  y += 18;

  const triggers = buildWalkAwayTriggers(decision);
  const triggerW = (CW - 24) / 2;
  triggers.slice(0, 2).forEach((t, i) => {
    const tx = M + i * (triggerW + 24);

    // Red eyebrow for category
    setType(doc, "label");
    setHex(doc, COLOR.red, "text");
    doc.text(t.category, tx, y);

    // Detail — body prose
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setHex(doc, COLOR.textBody, "text");
    const lines = doc.splitTextToSize(t.detail, triggerW);
    lines.slice(0, 4).forEach((line: string, li: number) => {
      doc.text(line, tx, y + 14 + li * 12);
    });
  });
  y += 70;

  // ─── DISCLAIMER ───────────────────────────────────────────────────────
  // Position toward the bottom of the page. If we still have space, we
  // anchor it just above the page footer rather than letting it float
  // mid-page.
  const disclaimerY = Math.max(y, PH - 80);
  setHex(doc, COLOR.borderSoft, "draw");
  doc.setLineWidth(0.4);
  doc.line(M, disclaimerY, M + CW, disclaimerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setHex(doc, COLOR.textFaint, "text");
  const disclaimer = "This report is generated for informational purposes only. AcquiFlow is not a registered investment advisor, broker-dealer, or M&A advisor. All figures are estimates based on buyer-provided inputs and proprietary benchmark data. Independent verification of financials, legal review, and qualified professional advice are required before any acquisition decision.";
  drawWrappedText(doc, disclaimer, M, disclaimerY + 12, CW, 7, COLOR.textFaint, 1.4, "normal");
}

// ─── Helper: interpret box ──────────────────────────────────────────────

function drawInterpretBox(doc: jsPDF, x: number, y: number, w: number, label: string, text: string): void {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const lines = doc.splitTextToSize(text, w - 24);
  const h = 14 + lines.length * 11 + 8;

  setHex(doc, "#F8FAFC", "fill");
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
// PAGE 6 — FINANCIAL QUALITY & BENCHMARK RISK
// ---------------------------------------------------------------------
// The "credibility stress test" page. Psychologically frames quality of
// earnings / earnings durability rather than raw benchmarking.
//
// Commit 3 redesign: de-dashboarded toward a credit-committee memo voice.
// The numbers support the underwriting argument; they don't lead it.
//
// Sections:
//   1. Financial Score Snapshot — asymmetric. Score on the left as a quiet
//      anchor (~30% width); structured prose interpretation of the score
//      on the right (~70% width). No 3-column equal grid.
//   2. Internal Consistency Analysis — memo-style observations. Top 2
//      tensions render as bold lead sentence + supporting paragraph. No
//      Signal/Why-It-Matters table. Clean profile = single italic line.
//   3. Normalization Sensitivity — narrative-left, metrics-right. The
//      interpretation paragraph is the lead; reported / normalized /
//      threshold DSCR stack compactly on the right as evidence.
//
// Renders only when data.benchmarkSnapshot is provided.
// =====================================================================

function drawPage6(
  doc: jsPDF,
  data: DealReportData,
  decision: DecisionLayerResult,
): void {
  const snap = data.benchmarkSnapshot;
  if (!snap) return;

  newPage(doc, 6, "Financial Quality");
  const { inputs } = data;

  let y = 78;

  // ─── Eyebrow + page title (page-8 voice) ─────────────────────────────
  setType(doc, "eyebrow");
  setHex(doc, COLOR.indigo, "text");
  doc.text("FINANCIAL QUALITY & BENCHMARK RISK", M, y);
  y += 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  setHex(doc, COLOR.textPrimary, "text");
  doc.text("Earnings durability and quality of underlying performance", M, y);
  y += 14;

  setType(doc, "L4");
  setHex(doc, COLOR.textMuted, "text");
  doc.text(
    "Tests whether reported metrics reflect durable performance, or depend on assumptions that warrant validation.",
    M, y,
  );
  y += 30;

  // ───────────────────────────────────────────────────────────────────────
  // SECTION 1 — Financial score snapshot
  // Asymmetric: score on the left as a quiet anchor (~30%), interpretation
  // prose on the right (~70%). The reading of the score is the headline,
  // not the score itself.
  // ───────────────────────────────────────────────────────────────────────

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  doc.text("FINANCIAL SCORE SNAPSHOT", M, y);
  y += 16;

  const scoreColW = 150;
  const proseColX = M + scoreColW + 24;
  const proseColW = CW - scoreColW - 24;
  const sectionTopY = y;

  const scoreColor =
    snap.financial_score === null ? COLOR.textDim
    : snap.financial_score >= 75   ? COLOR.emerald
    : snap.financial_score >= 55   ? COLOR.indigo
    : snap.financial_score >= 35   ? COLOR.amber
    :                                COLOR.red;

  // Left anchor: score
  setType(doc, "label");
  setHex(doc, COLOR.textDim, "text");
  doc.text("COMPOSITE", M, y);

  // Score number — bold 28pt. Measure its width WHILE this font is set,
  // before switching to L5 for the suffix, so getTextWidth returns the
  // actual rendered width.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  setHex(doc, scoreColor, "text");
  const scoreStr = snap.financial_score !== null ? String(snap.financial_score) : "\u2014";
  const scoreNumWidth = snap.financial_score !== null ? doc.getTextWidth(scoreStr) : 24;
  doc.text(scoreStr, M, y + 36);

  // " of 100" suffix — measured AFTER the score width was captured at
  // the right font; placed with a small visual gap.
  setType(doc, "L5");
  setHex(doc, COLOR.textMuted, "text");
  doc.text("of 100", M + scoreNumWidth + 6, y + 36);

  // Right side: structured prose reading of the score
  // Start the prose just below the COMPOSITE label so the lead sentence
  // visually anchors against the score number's top edge rather than
  // floating above it.
  let proseY = y + 14;

  // Lead sentence — the score interpreted, not announced
  const scoreReading = buildScoreReading(snap, scoreStr);
  setType(doc, "L3");
  setHex(doc, COLOR.textPrimary, "text");
  const leadLines = doc.splitTextToSize(scoreReading.lead, proseColW);
  leadLines.slice(0, 3).forEach((line: string, i: number) => {
    doc.text(line, proseColX, proseY + i * 14);
  });
  proseY += Math.min(leadLines.length, 3) * 14 + 8;

  // Industry context as inline body prose
  const industryName = snap.industry_name ?? inputs.industry_label ?? null;
  const naicsTag = snap.naics_code ? ` (NAICS ${snap.naics_code})` : "";
  const industryLine = industryName
    ? `Industry context: ${industryName}${naicsTag}. Benchmark year ${snap.benchmark_year}.`
    : `Benchmark year ${snap.benchmark_year}.`;

  setType(doc, "L4");
  setHex(doc, COLOR.textBody, "text");
  const ctxLines = doc.splitTextToSize(industryLine, proseColW);
  ctxLines.slice(0, 2).forEach((line: string, i: number) => {
    doc.text(line, proseColX, proseY + i * 13);
  });
  proseY += Math.min(ctxLines.length, 2) * 13 + 8;

  // Drivers as flowing prose, not a bullet list
  const driverLine = buildDriversLine(snap.score_drivers);
  if (driverLine) {
    setType(doc, "L4");
    setHex(doc, COLOR.textBody, "text");
    const driverLines = doc.splitTextToSize(driverLine, proseColW);
    driverLines.slice(0, 3).forEach((line: string, i: number) => {
      doc.text(line, proseColX, proseY + i * 13);
    });
    proseY += Math.min(driverLines.length, 3) * 13;
  }

  y = Math.max(sectionTopY + 64, proseY) + SP.md;

  // Score caveats — italic muted, restrained, no decorative bar
  if (snap.score_risk_dependencies && snap.score_risk_dependencies.length > 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    setHex(doc, COLOR.textMuted, "text");
    const caveatPrefix = snap.score_risk_dependencies.length === 1
      ? "Score sensitivity: "
      : "Score sensitivities: ";
    const caveatText = caveatPrefix + snap.score_risk_dependencies.join("; ");
    const caveatLines = doc.splitTextToSize(caveatText, CW);
    caveatLines.slice(0, 2).forEach((line: string, i: number) => {
      doc.text(line, M, y + i * 11);
    });
    y += Math.min(caveatLines.length, 2) * 11 + SP.lg;
  } else {
    y += SP.md;
  }

  // ───────────────────────────────────────────────────────────────────────
  // SECTION 2 — Internal consistency analysis
  // Memo-style observations. No table chrome. No header strip. Each tension
  // is a mini-section: bold lead sentence (signal) + paragraph (why).
  // Top 2 only — restraint over coverage.
  // ───────────────────────────────────────────────────────────────────────

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  doc.text("INTERNAL CONSISTENCY ANALYSIS", M, y);
  y += 18;

  const tensions = buildConsistencyTensions(snap);

  if (tensions.length === 0) {
    // Clean deal — single line of italic body prose, nothing more
    setType(doc, "L4");
    doc.setFont("helvetica", "italic");
    setHex(doc, COLOR.textMuted, "text");
    const cleanLines = doc.splitTextToSize(
      "Financial profile is internally consistent across coverage, profitability, and structural metrics. No cross-metric contradictions detected at this level of review.",
      CW,
    );
    cleanLines.slice(0, 2).forEach((line: string, i: number) => {
      doc.text(line, M, y + i * 13);
    });
    y += Math.min(cleanLines.length, 2) * 13 + SP.lg;
  } else {
    // Top 2 tensions as memo observations
    const shown = tensions.slice(0, 2);
    for (let i = 0; i < shown.length; i++) {
      if (y > PH - 220) break;
      const t = shown[i];

      // Lead sentence — bold L3, charcoal-black
      setType(doc, "L3");
      setHex(doc, COLOR.textPrimary, "text");
      const signalLines = doc.splitTextToSize(t.signal, CW);
      signalLines.slice(0, 2).forEach((line: string, idx: number) => {
        doc.text(line, M, y + idx * 14);
      });
      y += Math.min(signalLines.length, 2) * 14 + 6;

      // Supporting prose — L4 body
      setType(doc, "L4");
      setHex(doc, COLOR.textBody, "text");
      const whyLines = doc.splitTextToSize(t.why, CW);
      whyLines.slice(0, 4).forEach((line: string, idx: number) => {
        doc.text(line, M, y + idx * 13);
      });
      y += Math.min(whyLines.length, 4) * 13;

      // Inter-observation gap — generous, page-8 rhythm
      if (i < shown.length - 1) y += SP.md;
    }
    y += SP.lg;
  }

  // ───────────────────────────────────────────────────────────────────────
  // SECTION 3 — Normalization sensitivity
  // Narrative-left, metrics-right. Interpretation is the lead. The three
  // numbers stack compactly on the right as evidence supporting the read.
  // ───────────────────────────────────────────────────────────────────────

  if (snap.sensitivity && y < PH - 180) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setHex(doc, COLOR.indigo, "text");
    doc.text("NORMALIZATION SENSITIVITY", M, y);
    y += 18;

    const breaches = snap.sensitivity.normalized_dscr !== null && snap.sensitivity.normalized_dscr < 1.30;

    // Subtle status accent — single short tick above the section
    setHex(doc, breaches ? COLOR.red : COLOR.amber, "draw");
    doc.setLineWidth(1.0);
    doc.line(M, y - 8, M + 24, y - 8);

    // Layout: metrics column on the right (~150pt), prose fills the rest
    const metricsColW = 150;
    const proseW = CW - metricsColW - 24;
    const metricsX = M + CW - metricsColW;
    const sensitivityTopY = y;

    // Right column: stacked metrics as quiet evidence
    let metricY = y;

    setType(doc, "label");
    setHex(doc, COLOR.textDim, "text");
    doc.text("REPORTED", metricsX, metricY);
    setType(doc, "stat-medium");
    setHex(doc, COLOR.textPrimary, "text");
    doc.text(fmtRatio(snap.sensitivity.reported_dscr), metricsX + 70, metricY);
    metricY += 22;

    setType(doc, "label");
    setHex(doc, COLOR.textDim, "text");
    doc.text("NORMALIZED", metricsX, metricY);
    setType(doc, "stat-medium");
    setHex(doc, breaches ? COLOR.redText : COLOR.amberText, "text");
    doc.text(fmtRatio(snap.sensitivity.normalized_dscr), metricsX + 70, metricY);
    metricY += 22;

    setType(doc, "label");
    setHex(doc, COLOR.textDim, "text");
    doc.text("THRESHOLD", metricsX, metricY);
    setType(doc, "stat-medium");
    setHex(doc, COLOR.textMuted, "text");
    doc.text("1.30x", metricsX + 70, metricY);
    metricY += 14;

    setType(doc, "L5");
    setHex(doc, COLOR.textFaint, "text");
    doc.text("SBA / commercial minimum", metricsX, metricY);

    // Interpretation — Sonnet-generated when available, deterministic
    // fallback otherwise. Render as continuous body prose: trying to split
    // into lead/body via sentence-boundary regex breaks on em-dash-heavy
    // Sonnet output, so we keep the page-8 lead/body pattern out of this
    // block and let the prose flow naturally beneath an INTERPRETATION
    // eyebrow.
    const interpText = data.committeeProse?.page6_normalization_interpretation
      ?? buildDeterministicNormalizationInterp(snap.sensitivity, breaches);

    if (interpText) {
      // INTERPRETATION eyebrow — small navy uppercase
      setType(doc, "label");
      setHex(doc, COLOR.textDim, "text");
      doc.text("INTERPRETATION", M, sensitivityTopY);

      // Body prose — set the font BEFORE measuring so wrap matches draw
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      setHex(doc, COLOR.textBody, "text");
      const interpLines = doc.splitTextToSize(interpText, proseW);
      const startY = sensitivityTopY + 16;
      const maxLines = 8;
      const linesShown = Math.min(interpLines.length, maxLines);
      for (let i = 0; i < linesShown; i++) {
        doc.text(interpLines[i], M, startY + i * 13);
      }

      // Place the cursor below whichever column extends further; add a
      // generous gap so the page doesn't feel crowded at the bottom.
      y = Math.max(startY + linesShown * 13, metricY) + SP.lg;
    } else {
      y = metricY + SP.lg;
    }
  }
}

/**
 * Build the lead reading of the financial score — interprets the number
 * rather than restating it. Fed into the asymmetric Section 1 layout.
 */
function buildScoreReading(
  snap: BenchmarkSnapshotForReport,
  scoreStr: string,
): { lead: string } {
  if (snap.financial_score === null) {
    return {
      lead: "Composite score unavailable — benchmark coverage was insufficient to produce a confident reading.",
    };
  }
  // Indefinite article matches the leading digit's spoken sound:
  //   8 → "eight" (vowel)         → "An 8…"
  //   11, 18 → "eleven/eighteen"  → "An 11…", "An 18…"
  // Everything else takes "A".
  const article = scoreStartsWithVowelSound(scoreStr) ? "An" : "A";
  const s = snap.financial_score;
  if (s >= 75) {
    return {
      lead: `${article} ${scoreStr}/100 composite places this profile in the upper band — durable across profitability, coverage, liquidity, and efficiency relative to industry norms.`,
    };
  }
  if (s >= 55) {
    return {
      lead: `${article} ${scoreStr}/100 composite reads as broadly healthy — financial fundamentals align with industry expectations across most measured dimensions.`,
    };
  }
  if (s >= 35) {
    return {
      lead: `${article} ${scoreStr}/100 composite reflects a mixed financial profile — strengths in some dimensions, but material gaps that warrant validation before underwriting.`,
    };
  }
  return {
    lead: `${article} ${scoreStr}/100 composite signals meaningful weakness — the underlying metrics fall short of industry norms across multiple dimensions and require explanation before proceeding.`,
  };
}

/** Numbers that take "an" rather than "a" when spoken aloud. */
function scoreStartsWithVowelSound(scoreStr: string): boolean {
  if (scoreStr === "8" || scoreStr.startsWith("8")) return true;   // eight, eighty, eighty-eight
  if (scoreStr === "11" || scoreStr === "18") return true;          // eleven, eighteen
  return false;
}

/**
 * Convert score drivers (a list of short phrases from the engine) into a
 * single sentence of flowing prose. Returns null if no drivers.
 */
function buildDriversLine(drivers: string[]): string | null {
  if (!drivers || drivers.length === 0) return null;
  const top = drivers.slice(0, 3).map(d => {
    const s = d.trim();
    return s.charAt(0).toLowerCase() + s.slice(1);
  });
  if (top.length === 1) return `Score is anchored by ${top[0]}.`;
  if (top.length === 2) return `Score is anchored by ${top[0]} and ${top[1]}.`;
  return `Score is anchored by ${top[0]}, ${top[1]}, and ${top[2]}.`;
}

/**
 * Split a multi-sentence interpretation string into a lead sentence and
 * body remainder. Used to render Page 6's normalization interpretation in
 * the page-8 lead/body pattern. Falls back gracefully on short text.
 */
function splitLeadAndBody(text: string): { lead: string; body: string } {
  const trimmed = text.trim();
  // Match the first sentence ending in . ! or ?
  const m = trimmed.match(/^([^.!?]+[.!?])\s+(.*)$/s);
  if (m) {
    return { lead: m[1].trim(), body: m[2].trim() };
  }
  return { lead: trimmed, body: "" };
}

/**
 * Build the prioritized list of internal consistency tensions for Page 6
 * Section 2. Pulls from interaction_insights (cross-metric) first as those
 * are the highest-quality signals, then validation/risk outliers as
 * fallback. Returns at most 3 entries; can return 0 for clean deals.
 */
function buildConsistencyTensions(
  snap: BenchmarkSnapshotForReport,
): { signal: string; why: string; severity: "high" | "medium" | "low" }[] {
  const out: { signal: string; why: string; severity: "high" | "medium" | "low" }[] = [];

  // Cross-metric interactions are highest-quality signals
  for (const ins of snap.interaction_insights) {
    if (out.length >= 3) break;
    out.push({
      signal: humanizeInteractionRule(ins.rule),
      why:    ins.message,
      severity: ins.severity === "high" ? "high" : "medium",
    });
  }

  // Validation outliers (potential add-back inflation) are second
  if (out.length < 3) {
    const validationOutliers = snap.financial_position.filter(r => r.outlier_kind === "validation");
    for (const row of validationOutliers) {
      if (out.length >= 3) break;
      // Skip if already covered by an interaction insight
      const alreadyCovered = out.some(t =>
        t.why.toLowerCase().includes(row.metric_label.toLowerCase().split(" ")[0])
      );
      if (alreadyCovered) continue;
      out.push({
        signal: `${row.metric_label} reads materially above peer norms.`,
        why:    `${row.metric_label} sits in the ${fmtPercentile(row.display_percentile)} percentile against industry, raising the question of whether reported figures reflect normalized operations or carry add-backs that warrant validation.`,
        severity: "medium",
      });
    }
  }

  // Sources & uses imbalance (structural)
  if (out.length < 3 && snap.deal_structure && !snap.deal_structure.sources_uses.balanced) {
    out.push({
      signal: "Capital structure does not currently balance.",
      why:    "Total sources do not match total uses, suggesting the financing stack has not yet been finalized or working capital assumptions remain unresolved. Reconciliation is required before lender submission.",
      severity: "medium",
    });
  }

  return out;
}

/**
 * Map an interaction_insight rule key into a complete declarative sentence
 * suitable as a memo-style lead line. These are the rule names emitted by
 * the engine's risk-flags / interactions module.
 *
 * If a new rule key surfaces that isn't in this map, we render a generic
 * fallback rather than auto-title-casing the rule name — the latter
 * produces awkward output like "Sde Outlier Dscr Dependency." which leaks
 * implementation detail into the memo.
 */
function humanizeInteractionRule(rule: string): string {
  const map: Record<string, string> = {
    // Original rule names
    sde_validation_with_strong_dscr: "Reported coverage strength is contingent on an elevated SDE figure that warrants validation.",
    high_leverage_strong_cashflow:   "Capital structure carries elevated leverage despite reported cash flow strength.",
    weak_margin_strong_dscr:         "Reported coverage holds despite operating margins that read below peer norms.",
    multiple_validation_outliers:    "Multiple metrics sit in validation-outlier territory simultaneously.",
    risk_outlier_with_strong_score:  "A material risk outlier sits within an otherwise strong financial profile.",
    // Rules surfaced from the engine in production
    sde_outlier_dscr_dependency:     "Reported coverage strength may depend on an elevated SDE figure that warrants validation.",
    high_ltv_with_context:           "Loan-to-value remains elevated relative to purchase price despite otherwise strong cash flow.",
  };
  if (map[rule]) return map[rule];
  // Unknown rule — return a generic, memo-toned sentence rather than
  // exposing the raw rule key as a title. This is the failsafe that
  // prevents "Sde Outlier Dscr Dependency."-style leakage into the report.
  return "Cross-metric tension surfaced during analysis warrants attention during diligence.";
}

/**
 * Deterministic fallback for Page 6's normalization interpretation when
 * Sonnet prose isn't available. Lender-aware tone, no fabrication.
 */
function buildDeterministicNormalizationInterp(
  s: NonNullable<BenchmarkSnapshotForReport["sensitivity"]>,
  breaches: boolean,
): string {
  if (breaches) {
    return `The acquisition appears comfortably financeable under seller-reported earnings. However, if earnings normalize toward observed industry margins, debt coverage compresses to ${fmtRatio(s.normalized_dscr)} — below the 1.30x lender minimum. Transaction viability is highly sensitive to add-back validation during diligence.`;
  }
  return `Reported earnings sustain stated debt coverage. If SDE were normalized toward the industry median margin, coverage would compress to ${fmtRatio(s.normalized_dscr)}, which remains above the 1.30x lender threshold but materially reduces cushion. Add-back validation remains a core diligence item.`;
}

// =====================================================================
// PAGE 7 — DEAL STRUCTURE & CREDIT COMMITTEE REVIEW
// ---------------------------------------------------------------------
// Lender-grade, financing-focused review. Frames the deal less as a
// dashboard widget and more as a financing memorandum.
//
// Commit 3 redesign: converged toward Page 8's editorial voice. Concerns
// and diligence items now read like committee findings, not UI risk cards.
//
// Sections:
//   1. Capital Structure Overview — softened. Column labels without
//      underline rule, taller rows, true-hairline dividers only.
//   2. Sources & Uses — unified typography (setType throughout), restrained
//      dividers, hairline-only imbalance notice.
//   3. Credit Committee Concerns — callout strips. Each concern: navy left
//      edge, no fill, category eyebrow, bold lead sentence (the issue),
//      supporting paragraph (the implication). Deterministic lead/body
//      pairs from groupCommitteeConcerns(). No bullet groups.
//   4. Recommended Diligence Priorities — memo-style numbered. Each item:
//      bold lead sentence (the priority) + italic muted why-line (the
//      rationale). Deterministic lead/why pairs from
//      buildDiligencePriorities(). Sonnet additions append as lead-only.
// =====================================================================

function drawPage7(
  doc: jsPDF,
  data: DealReportData,
  decision: DecisionLayerResult,
): void {
  const snap = data.benchmarkSnapshot;
  if (!snap) return;

  newPage(doc, 7, "Credit Committee Review");

  let y = 78;

  // ─── Eyebrow + page title (page-8 voice) ─────────────────────────────
  setType(doc, "eyebrow");
  setHex(doc, COLOR.indigo, "text");
  doc.text("DEAL STRUCTURE & CREDIT COMMITTEE REVIEW", M, y);
  y += 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  setHex(doc, COLOR.textPrimary, "text");
  doc.text("Capital structure, lender perspective, and diligence sequencing", M, y);
  y += 14;

  setType(doc, "L4");
  setHex(doc, COLOR.textMuted, "text");
  doc.text(
    "Tests whether the proposed financing structure underwrites cleanly and identifies items requiring resolution.",
    M, y,
  );
  y += 30;

  // ───────────────────────────────────────────────────────────────────────
  // SECTION 1 — Capital structure overview
  // Softened: column headers without underline rule, taller rows for
  // breathing room, true-hairline row separators only.
  // ───────────────────────────────────────────────────────────────────────

  if (snap.deal_structure && snap.deal_structure.metrics.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setHex(doc, COLOR.indigo, "text");
    doc.text("CAPITAL STRUCTURE OVERVIEW", M, y);
    y += 18;

    const colMetric = M;
    const colResult = M + 180;
    const colComment = M + 270;

    // Column labels — labels alone, no underline rule
    setType(doc, "label");
    setHex(doc, COLOR.textDim, "text");
    doc.text("METRIC",     colMetric,  y);
    doc.text("RESULT",     colResult,  y);
    doc.text("COMMENTARY", colComment, y);
    y += 14;

    // Hairline above first row
    setHex(doc, COLOR.borderSoft, "draw");
    doc.setLineWidth(0.3);
    doc.line(M, y, M + CW, y);
    y += SP.sm + 2;

    for (const metric of snap.deal_structure.metrics) {
      const c = metric.status_color
        ? STATUS_COLOR_MAP[metric.status_color]
        : { fill: "#F8FAFC", stroke: COLOR.borderSoft, text: COLOR.textMuted };

      const rowH = 34;  // moderate breathing room — Page 7 is space-constrained

      // Metric label
      setType(doc, "L4");
      doc.setFont("helvetica", "bold");
      setHex(doc, COLOR.textPrimary, "text");
      doc.text(metric.label, colMetric, y + 6);

      // Result — value + status text below
      setType(doc, "stat-medium");
      setHex(doc, COLOR.textPrimary, "text");
      doc.text(metric.display, colResult, y + 6);

      setType(doc, "label");
      setHex(doc, c.text, "text");
      doc.text(metric.status.toUpperCase(), colResult, y + 20);

      // Commentary
      const commentary = buildCapitalStructureCommentary(metric);
      setType(doc, "L5");
      setHex(doc, COLOR.textBody, "text");
      const commLines = doc.splitTextToSize(commentary, CW - (colComment - M));
      commLines.slice(0, 2).forEach((line: string, i: number) => {
        doc.text(line, colComment, y + 6 + i * 11);
      });

      y += rowH;
      // True hairline divider
      setHex(doc, COLOR.borderSoft, "draw");
      doc.setLineWidth(0.3);
      doc.line(M, y, M + CW, y);
    }
    y += SP.md;
  }

  // ───────────────────────────────────────────────────────────────────────
  // SECTION 2 — Sources & uses
  // Two-column tables, unified typography (setType throughout), restrained
  // dividers. Imbalance notice keeps the existing hairline-only treatment.
  // ───────────────────────────────────────────────────────────────────────

  if (snap.deal_structure) {
    const su = snap.deal_structure.sources_uses;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setHex(doc, COLOR.indigo, "text");
    doc.text("SOURCES & USES", M, y);
    y += 16;

    const tableW = (CW - 16) / 2;
    const rowH2 = 21;

    // Uses (left)
    let leftY = y;
    setType(doc, "label");
    setHex(doc, COLOR.textDim, "text");
    doc.text("USES",   M + 4,           leftY);
    doc.text("AMOUNT", M + tableW - 4,  leftY, { align: "right" });
    leftY += SP.sm + 2;
    setHex(doc, COLOR.borderSoft, "draw");
    doc.setLineWidth(0.3);
    doc.line(M, leftY, M + tableW, leftY);
    leftY += SP.sm + 2;

    const usesRows = [
      { label: "Purchase Price",   amount: su.purchase_price,         bold: false },
      { label: "Working Capital",  amount: su.working_capital_needed, bold: false },
      { label: "Total Uses",       amount: su.total_uses,             bold: true  },
    ];

    for (const r of usesRows) {
      setType(doc, "L4");
      doc.setFont("helvetica", r.bold ? "bold" : "normal");
      setHex(doc, r.bold ? COLOR.textPrimary : COLOR.textBody, "text");
      doc.text(r.label, M + 4, leftY + 6);
      doc.text(fmtUsd(r.amount), M + tableW - 4, leftY + 6, { align: "right" });

      leftY += rowH2;
      setHex(doc, r.bold ? COLOR.borderHairline : COLOR.borderSoft, "draw");
      doc.setLineWidth(r.bold ? 0.4 : 0.3);
      doc.line(M, leftY, M + tableW, leftY);
    }

    // Sources (right)
    let rightY = y;
    const rightX = M + tableW + 16;
    setType(doc, "label");
    setHex(doc, COLOR.textDim, "text");
    doc.text("SOURCES", rightX + 4,           rightY);
    doc.text("AMOUNT",  rightX + tableW - 4,  rightY, { align: "right" });
    rightY += SP.sm + 2;
    setHex(doc, COLOR.borderSoft, "draw");
    doc.setLineWidth(0.3);
    doc.line(rightX, rightY, rightX + tableW, rightY);
    rightY += SP.sm + 2;

    const sourcesRows = [
      { label: "Buyer Equity",  amount: su.buyer_equity,  bold: false },
      { label: "Senior Debt",   amount: su.senior_debt,   bold: false },
      { label: "Seller Note",   amount: su.seller_note,   bold: false },
      { label: "Total Sources", amount: su.total_sources, bold: true  },
    ];

    for (const r of sourcesRows) {
      setType(doc, "L4");
      doc.setFont("helvetica", r.bold ? "bold" : "normal");
      setHex(doc, r.bold ? COLOR.textPrimary : COLOR.textBody, "text");
      doc.text(r.label, rightX + 4, rightY + 6);
      doc.text(fmtUsd(r.amount), rightX + tableW - 4, rightY + 6, { align: "right" });

      rightY += rowH2;
      setHex(doc, r.bold ? COLOR.borderHairline : COLOR.borderSoft, "draw");
      doc.setLineWidth(r.bold ? 0.4 : 0.3);
      doc.line(rightX, rightY, rightX + tableW, rightY);
    }

    y = Math.max(leftY, rightY) + SP.sm;

    // Imbalance notice — hairline-only, italic body prose
    if (!su.balanced) {
      const gap = su.total_uses - su.total_sources;
      setHex(doc, COLOR.amber, "draw");
      doc.setLineWidth(0.8);
      doc.line(M, y, M + 24, y);
      y += SP.sm + 4;

      setType(doc, "L4");
      setHex(doc, COLOR.amberText, "text");
      doc.text(
        `Sources & uses do not balance — ${gap > 0 ? "short" : "over"} by ${fmtUsd(Math.abs(gap))}. Resolve before lender submission.`,
        M, y,
      );
      y += SP.md;
    } else {
      y += SP.md;
    }
  } else {
    setType(doc, "L4");
    doc.setFont("helvetica", "italic");
    setHex(doc, COLOR.textMuted, "text");
    doc.text(
      "Acquisition structure inputs (purchase price, equity, debt mix) not provided in this analysis.",
      M, y,
    );
    y += SP.lg;
  }

  // ───────────────────────────────────────────────────────────────────────
  // SECTION 3 — Credit committee concerns (callout strips)
  // Each concern: navy left edge, no fill, category eyebrow above lead.
  // Bold lead sentence at L3. One paragraph of supporting prose at L4.
  // ───────────────────────────────────────────────────────────────────────

  if (y > PH - 200) return;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  doc.text("CREDIT COMMITTEE CONCERNS", M, y);
  y += 14;

  const concerns = groupCommitteeConcerns(snap);

  if (concerns.length === 0) {
    setType(doc, "L4");
    doc.setFont("helvetica", "italic");
    setHex(doc, COLOR.textMuted, "text");
    doc.text(
      "No structural or quality concerns surfaced at the committee level for this transaction.",
      M, y,
    );
    y += SP.lg;
  } else {
    // Render up to 3 callout strips. Tighter inter-strip spacing than the
    // page-8 sections to fit alongside diligence priorities below.
    const shown = concerns.slice(0, 3);
    for (let i = 0; i < shown.length; i++) {
      const c = shown[i];

      // Estimate strip height to know if we have room
      setType(doc, "L4");
      const bodyLines = doc.splitTextToSize(c.body, CW - 16);
      const linesShown = Math.min(bodyLines.length, 2);
      const stripH = 18 + 14 + linesShown * 13 + 4;  // eyebrow + lead + body lines

      if (y + stripH > PH - 110) break;  // leave room for diligence below

      // Navy left edge — single 1.5pt rule running the full height
      setHex(doc, COLOR.indigo, "fill");
      doc.rect(M, y - 2, 1.5, stripH, "F");

      // Category eyebrow — slate small-caps
      setType(doc, "label");
      setHex(doc, COLOR.textDim, "text");
      doc.text(c.category.toUpperCase(), M + 12, y + 6);

      // Lead — bold L3, charcoal-black
      setType(doc, "L3");
      setHex(doc, COLOR.textPrimary, "text");
      const leadLines = doc.splitTextToSize(c.lead, CW - 16);
      leadLines.slice(0, 2).forEach((line: string, idx: number) => {
        doc.text(line, M + 12, y + 22 + idx * 14);
      });
      const leadH = Math.min(leadLines.length, 2) * 14;

      // Body — L4, supporting prose
      setType(doc, "L4");
      setHex(doc, COLOR.textBody, "text");
      bodyLines.slice(0, 2).forEach((line: string, idx: number) => {
        doc.text(line, M + 12, y + 22 + leadH + 6 + idx * 13);
      });

      y += 22 + leadH + 6 + linesShown * 13 + SP.sm;
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // SECTION 4 — Recommended diligence priorities (memo-style numbered)
  // Each item: bold lead sentence + one line of muted italic context.
  // ───────────────────────────────────────────────────────────────────────

  // No upfront-bail — we rely on the per-item check below so at least the
  // section header renders even when items don't fit.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  doc.text("RECOMMENDED DILIGENCE PRIORITIES", M, y);
  y += 16;

  const priorities = buildDiligencePriorities(snap, data.committeeProse);

  if (priorities.length === 0) {
    setType(doc, "L4");
    doc.setFont("helvetica", "italic");
    setHex(doc, COLOR.textMuted, "text");
    doc.text(
      "Standard diligence applies; no transaction-specific priorities flagged.",
      M, y,
    );
    return;
  }

  // Show up to 4 priorities. Each item has a bold lead + optional italic
  // why-line. If space is tight, drop the why-line for that item rather
  // than skipping the priority entirely — the lead is what matters most.
  const shownPriorities = priorities.slice(0, 4);
  for (let i = 0; i < shownPriorities.length; i++) {
    const p = shownPriorities[i];

    // Measure lead at the actual draw font (L4 bold) before splitting.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const leadLines = doc.splitTextToSize(p.lead, CW - 24);

    // Measure why at the actual draw font (italic 9pt) before splitting.
    let whyLines: string[] = [];
    if (p.why) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      whyLines = doc.splitTextToSize(p.why, CW - 24);
    }

    const leadH = Math.min(leadLines.length, 2) * 13;
    const fullWhyH = whyLines.length > 0 ? Math.min(whyLines.length, 2) * 12 + 2 : 0;
    const leadOnlyH = 4 + leadH;
    const fullItemH = 4 + leadH + fullWhyH;

    // Bail only if we can't even fit the lead. Otherwise render lead +
    // optional why depending on space.
    if (y + leadOnlyH > PH - 50) break;
    const renderWhy = whyLines.length > 0 && (y + fullItemH <= PH - 50);

    // Numbered marker — navy, modest
    setType(doc, "L3");
    setHex(doc, COLOR.indigo, "text");
    doc.text(`${i + 1}.`, M, y + 10);

    // Lead — L4 bold
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setHex(doc, COLOR.textPrimary, "text");
    leadLines.slice(0, 2).forEach((line: string, idx: number) => {
      doc.text(line, M + 18, y + 10 + idx * 13);
    });
    let nextY = y + 10 + leadH;

    // Why — only when there's headroom
    if (renderWhy) {
      const whyShown = Math.min(whyLines.length, 2);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      setHex(doc, COLOR.textMuted, "text");
      whyLines.slice(0, 2).forEach((line: string, idx: number) => {
        doc.text(line, M + 18, nextY + 2 + idx * 12);
      });
      nextY += 2 + whyShown * 12;
    }

    y = nextY + SP.sm;
  }
}

/**
 * Build deterministic commentary for a capital-structure metric. Lender-aware
 * tone. The metric's status_color drives the framing.
 */
function buildCapitalStructureCommentary(
  metric: NonNullable<BenchmarkSnapshotForReport["deal_structure"]>["metrics"][number],
): string {
  if (metric.value === null) return "Insufficient inputs to evaluate.";

  if (metric.key === "dscr") {
    if (metric.value >= 1.50) return "Coverage exceeds standard lender comfort thresholds with cushion for variability.";
    if (metric.value >= 1.30) return "Coverage meets the standard lender minimum with limited cushion.";
    return "Coverage falls below the 1.30x lender minimum; financing as proposed is at risk.";
  }

  if (metric.key === "debt_to_sde") {
    if (metric.value <= 2.50) return "Leverage profile is conservative relative to typical SBA acquisition debt levels.";
    if (metric.value <= 4.00) return "Leverage is within the standard SBA acquisition range.";
    return "Leverage exceeds typical SBA comfort levels; lenders may require structural adjustments.";
  }

  if (metric.key === "ltv") {
    if (metric.value <= 0.75) return "LTV provides comfortable lender cushion against valuation drift.";
    if (metric.value <= 0.85) return "LTV is within typical SBA acceptance, with limited cushion against valuation risk.";
    return "LTV exceeds preferred lender comfort; expect tighter underwriting and possible equity injection requests.";
  }

  return metric.explanation || "";
}

/**
 * Group risk flags and interactions into committee concern categories.
 * Returns three groups with potentially empty items[] arrays.
 */
/**
 * Build the prioritized list of credit committee concerns as memo-style
 * callout-strip data. Each concern carries a category tag, a bold lead
 * sentence (the issue), and a supporting paragraph (the implication).
 *
 * Categories: Earnings Quality, Structural Risk, Financing Risk
 *
 * Output is ordered by category and capped at 6 total. Empty categories
 * are simply absent — the renderer doesn't need to know what's missing.
 */
function groupCommitteeConcerns(
  snap: BenchmarkSnapshotForReport,
): { category: string; lead: string; body: string }[] {
  const out: { category: string; lead: string; body: string }[] = [];
  const seenLeads = new Set<string>();

  const push = (category: string, lead: string, body: string) => {
    const key = lead.toLowerCase().trim();
    if (seenLeads.has(key)) return;
    seenLeads.add(key);
    out.push({ category, lead, body });
  };

  // ─── Earnings Quality ────────────────────────────────────────────────
  // SDE / margin / revenue flags + interaction insights citing those metrics
  // + normalization sensitivity breach when DSCR compresses below 1.30x.

  for (const f of snap.risk_flags) {
    if (f.metric_key.includes("sde") || f.metric_key.includes("margin") || f.metric_key.includes("revenue")) {
      push(
        "Earnings Quality",
        normalizeLead(f.message),
        buildEarningsBody(f.metric_key, f.severity),
      );
    }
  }

  for (const ins of snap.interaction_insights) {
    if (ins.metrics.some(m => m.includes("sde") || m.includes("margin"))) {
      push(
        "Earnings Quality",
        normalizeLead(ins.message),
        "Cross-metric tensions of this kind typically resolve only through trailing-twelve-month verification of reported figures against tax returns and bank deposits.",
      );
    }
  }

  if (snap.sensitivity && snap.sensitivity.normalized_dscr !== null && snap.sensitivity.normalized_dscr < 1.30) {
    push(
      "Earnings Quality",
      "Coverage compresses below the lender minimum under normalized earnings.",
      `If SDE were normalized toward industry median margins, DSCR would compress to ${fmtRatio(snap.sensitivity.normalized_dscr)} — short of the 1.30x lender threshold. Add-back validation is therefore decisive to the financing path, not incidental to it.`,
    );
  }

  // ─── Structural Risk ─────────────────────────────────────────────────
  // Sources & uses balance, LTV, leverage, and any structure-level flags.

  if (snap.deal_structure) {
    if (!snap.deal_structure.sources_uses.balanced) {
      const gap = snap.deal_structure.sources_uses.total_uses - snap.deal_structure.sources_uses.total_sources;
      push(
        "Structural Risk",
        "Capital structure does not balance as currently modeled.",
        `Sources fall ${gap > 0 ? "short of" : "above"} uses by ${fmtUsd(Math.abs(gap))}. Reconciliation of equity contribution, debt sizing, or working capital assumption is required before this stack can be presented to a lender.`,
      );
    }
    for (const m of snap.deal_structure.metrics) {
      if (m.key === "ltv" && m.value !== null && m.value > 0.85) {
        push(
          "Structural Risk",
          "Loan-to-value exceeds preferred lender comfort.",
          "LTV at this level reduces the cushion lenders rely on for valuation drift and may prompt either a higher equity injection requirement or a lower senior debt commitment than modeled.",
        );
      }
      if (m.key === "debt_to_sde" && m.value !== null && m.value > 4.00) {
        push(
          "Structural Risk",
          "Total leverage exceeds typical SBA acquisition guidelines.",
          "Debt-to-SDE above 4.0x signals an aggressive stack relative to standard SBA underwriting. Expect probing on add-back validity and stress-test sensitivities during lender review.",
        );
      }
    }
    for (const f of snap.deal_structure.flags) {
      push(
        "Structural Risk",
        normalizeLead(f.message),
        "Structural items at this severity typically warrant explicit resolution in the term sheet rather than deferral to closing diligence.",
      );
    }
  }

  // ─── Financing Risk ──────────────────────────────────────────────────
  // DSCR, current ratio, and reported coverage shortfalls.

  for (const f of snap.risk_flags) {
    if (f.metric_key === "dscr" || f.metric_key === "current_ratio") {
      push(
        "Financing Risk",
        normalizeLead(f.message),
        f.metric_key === "dscr"
          ? "Debt service coverage at this level constrains the lender's willingness to commit at proposed terms; pricing, amortization, or equity contribution may need to flex to bring coverage into the comfort band."
          : "Liquidity at this level may not absorb a typical first-year working capital draw without supplemental capital, raising the prospect of a revolver requirement at close.",
      );
    }
  }
  if (snap.deal_structure) {
    for (const m of snap.deal_structure.metrics) {
      if (m.key === "dscr" && m.value !== null && m.value < 1.30) {
        push(
          "Financing Risk",
          "Reported DSCR sits below the 1.30x lender minimum.",
          "Coverage at this level means financing as currently proposed is unlikely to clear underwriting without restructuring — typically through reduced senior debt, extended amortization, or a larger seller note.",
        );
      }
    }
  }

  return out.slice(0, 6);
}

/**
 * Strip awkward leading conjunctions, ensure sentence-final punctuation,
 * and capitalize the first character so a flag message can sit comfortably
 * as a memo lead.
 */
function normalizeLead(s: string): string {
  let t = s.trim();
  if (!t) return t;
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (!/[.!?]$/.test(t)) t += ".";
  return t;
}

/**
 * Build a deterministic supporting paragraph for an earnings-quality flag,
 * keyed off the metric type and severity. Pure mapping, no fabrication.
 */
function buildEarningsBody(metricKey: string, severity: "high" | "medium" | "low" | "info"): string {
  if (metricKey.includes("sde")) {
    return severity === "high"
      ? "The committee will treat the reported SDE figure as provisional until validated against tax returns and bank statements. The financial case for the deal materially depends on resolving this."
      : "Reported SDE warrants validation against trailing-twelve-month documentation. Add-backs at this level are a routine area of probing during diligence.";
  }
  if (metricKey.includes("margin")) {
    return "Operating margins outside peer norms warrant explanation — typically resolved by mapping the chart of accounts against industry standard categorization, or by isolating non-recurring costs from steady-state operations.";
  }
  if (metricKey.includes("revenue")) {
    return "Revenue concentration or trajectory at this level is a standard area of probing for both the buyer and the lender; customer concentration analysis and trailing growth detail will be required.";
  }
  return "This signal warrants explanation during diligence before committee approval.";
}

/**
 * Build the diligence priorities list. Deterministic core (driven by which
 * flag patterns fired) plus optional Sonnet additions. Capped at 6 items.
 */
/**
 * Build the diligence priorities list as memo-style entries: a bold lead
 * sentence (the priority) and a single supporting why-line (the rationale).
 *
 * Deterministic core (driven by which flag patterns fired) plus optional
 * Sonnet additions appended without why-lines (we don't trust ourselves
 * to generate rationale prose for outside additions). Capped at 6.
 */
function buildDiligencePriorities(
  snap: BenchmarkSnapshotForReport,
  prose?: CommitteeMemoProse,
): { lead: string; why: string | null }[] {
  const out: { lead: string; why: string | null }[] = [];

  // Validation outlier on SDE → add-back validation is the priority
  const hasSdeValidation = snap.financial_position.some(
    r => r.metric_key === "sde_margin_pct" && r.outlier_kind === "validation"
  );
  if (hasSdeValidation) {
    out.push({
      lead: "Validate seller add-backs against trailing-twelve-month tax returns and bank statements.",
      why:  "Add-backs of the magnitude implied by reported margins typically warrant CPA-prepared quality-of-earnings work before lender submission.",
    });
  }

  // Sensitivity present → stress-test debt service
  if (snap.sensitivity) {
    out.push({
      lead: "Stress-test debt service under normalized earnings assumptions.",
      why:  "Coverage durability — not just headline DSCR — drives both lender comfort and the buyer's downside protection in the first twenty-four months post-close.",
    });
  }

  // Sources & uses imbalance
  if (snap.deal_structure && !snap.deal_structure.sources_uses.balanced) {
    out.push({
      lead: "Reconcile sources & uses imbalance before lender submission.",
      why:  "Lenders will not engage on a stack that does not balance; this is a gating item, not a diligence subtopic.",
    });
  }

  // Working capital not provided or zero → call out
  if (snap.deal_structure && (snap.deal_structure.sources_uses.working_capital_needed === 0)) {
    out.push({
      lead: "Confirm working capital requirements at close.",
      why:  "The current model assumes no working capital need; absent verification, this is the most common source of post-close cash crunch in lower-middle-market acquisitions.",
    });
  }

  // High LTV
  if (snap.deal_structure) {
    const ltv = snap.deal_structure.metrics.find(m => m.key === "ltv");
    if (ltv && ltv.value !== null && ltv.value > 0.85) {
      out.push({
        lead: "Review lender appetite for elevated LTV early in the process.",
        why:  "An equity injection requirement at term-sheet stage is materially less disruptive than discovering one during final underwriting.",
      });
    }
  }

  // Inventory turnover anomaly
  const invTurnover = snap.financial_position.find(r => r.metric_key === "inventory_turnover");
  if (invTurnover && invTurnover.deal_value !== null && invTurnover.industry_median !== null) {
    const ratio = invTurnover.deal_value / invTurnover.industry_median;
    if (ratio > 5 || ratio < 0.2) {
      out.push({
        lead: "Verify inventory accounting basis against peer norms.",
        why:  "Reported turnover differs materially from industry medians; reconciliation determines whether this reflects operational distinction or accounting treatment.",
      });
    }
  }

  // Customer concentration as a standard line for any deal under scrutiny
  const hasMaterialRisk =
    snap.tension_indicator !== null ||
    snap.risk_flags.some(f => f.severity === "high");
  if (hasMaterialRisk && out.length < 5) {
    out.push({
      lead: "Confirm transferability of key customer contracts and supplier relationships.",
      why:  "For deals carrying elevated risk markers, contract-by-contract review of post-close consent requirements becomes a standard committee expectation.",
    });
  }

  // Append Sonnet additions as lead-only entries (no rationale prose generated)
  if (prose?.page7_diligence_additions) {
    for (const add of prose.page7_diligence_additions) {
      if (out.length >= 6) break;
      // De-dupe against deterministic core by lead substring match
      if (!out.some(existing => similarItem(existing.lead, add))) {
        out.push({ lead: normalizeLead(add), why: null });
      }
    }
  }

  return out.slice(0, 6);
}

/** Quick fuzzy de-dupe — checks if two diligence items share key terms. */
function similarItem(a: string, b: string): boolean {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  // If both share a high-signal phrase, treat as similar
  const phrases = ["add-back", "add back", "sources & uses", "sources and uses", "working capital", "ltv", "loan-to-value", "stress-test", "stress test"];
  for (const p of phrases) {
    if (aLower.includes(p) && bLower.includes(p)) return true;
  }
  return false;
}

// =====================================================================
// PAGE 8 — INVESTMENT COMMITTEE SUMMARY
// ---------------------------------------------------------------------
// One-page narrative memo. Five sections, structured prose: bold lead
// sentence, supporting paragraph, optional pull quote in shaded box.
// Renders only when data.committeeProse is provided (i.e. the Sonnet
// committee call succeeded and passed numeric validation).
// =====================================================================

function drawPage8(
  doc: jsPDF,
  data: DealReportData,
  decision: DecisionLayerResult,
): void {
  const prose = data.committeeProse;
  if (!prose) return;

  newPage(doc, 8, "Investment Committee Summary");

  let y = 78;

  // ─── Eyebrow ─────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  setHex(doc, COLOR.indigo, "text");
  doc.text("INVESTMENT COMMITTEE SUMMARY", M, y);
  y += 18;

  // ─── Page title ──────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  setHex(doc, COLOR.textPrimary, "text");
  doc.text("Synthesized recommendation memorandum", M, y);
  y += 14;

  // ─── Subtitle ────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setHex(doc, COLOR.textMuted, "text");
  doc.text(
    "Single-page integration of merits, risks, financing outlook, and recommended path forward.",
    M, y,
  );
  y += 30;

  const memo = prose.page8_memo;
  const sections = [
    { key: "investment_merits",        title: "Investment Merits",        section: memo.investment_merits },
    { key: "primary_risks",            title: "Primary Risks",            section: memo.primary_risks },
    { key: "financing_outlook",        title: "Financing Outlook",        section: memo.financing_outlook },
    { key: "negotiation_leverage",     title: "Negotiation Leverage",     section: memo.negotiation_leverage },
    { key: "recommended_path_forward", title: "Recommended Path Forward", section: memo.recommended_path_forward },
  ];

  // Render each section with generous spacing.
  // 22pt between sections (was 14pt) — institutional whitespace rhythm.
  for (let i = 0; i < sections.length; i++) {
    if (y > PH - 80) break;
    const s = sections[i];
    y = drawCommitteeMemoSection(doc, y, s.title, s.section);

    // Section spacer with optional hairline divider for the first 4 (not the last)
    if (i < sections.length - 1 && y < PH - 100) {
      y += 12;
      setHex(doc, COLOR.borderSoft, "draw");
      doc.setLineWidth(0.3);
      doc.line(M, y, M + CW, y);
      y += 14;
    } else {
      y += 22;
    }
  }
}

/**
 * Render a single Page-8 section with structured-prose layout:
 *   [Section header — uppercase navy, no decorative mark]
 *   [Bold lead sentence — strongest contrast on the page]
 *   [Supporting paragraph]   [Pull quote — navy edge only, no fill]
 *
 * Returns the new y position after the section.
 *
 * Page 8 polish (commit 2):
 *   - Section marks dropped — typography carries the structure
 *   - Lead sentence increased to L3 (11pt bold charcoal-black)
 *   - Body line height increased from 11 to 13
 *   - Pull quote soft: navy left edge only, white fill, more breathing room
 */
function drawCommitteeMemoSection(
  doc: jsPDF,
  y: number,
  title: string,
  section: CommitteeMemoSection,
): number {
  // Section header — uppercase navy, no mark, no underline. Typography only.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setHex(doc, COLOR.indigo, "text");
  doc.text(title.toUpperCase(), M, y);
  y += 16;

  // Pull-quote zone reserved on the right
  const pullQuoteW = 160;
  const proseW = CW - pullQuoteW - 24;

  // Bold lead sentence — increased contrast (charcoal-black) and size
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setHex(doc, COLOR.textPrimary, "text");
  const leadLines = doc.splitTextToSize(section.lead, proseW);
  const leadLineHeight = 14;
  leadLines.slice(0, 3).forEach((line: string, i: number) => {
    doc.text(line, M, y + i * leadLineHeight);
  });
  let proseY = y + Math.min(leadLines.length, 3) * leadLineHeight + 8;

  // Supporting paragraph — generous line height for editorial feel
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setHex(doc, COLOR.textBody, "text");
  const bodyLines = doc.splitTextToSize(section.body, proseW);
  const bodyLineHeight = 13;
  bodyLines.slice(0, 6).forEach((line: string, i: number) => {
    doc.text(line, M, proseY + i * bodyLineHeight);
  });
  proseY += Math.min(bodyLines.length, 6) * bodyLineHeight;

  // Pull quote — navy left edge only, no fill, no border. Editorial feel.
  if (section.pull_quote) {
    const pullQuoteX = M + CW - pullQuoteW;
    const pullQuoteY = y - 2;
    const pullQuoteH = 50;

    // Navy left edge — single 2pt rule
    setHex(doc, COLOR.indigo, "fill");
    doc.rect(pullQuoteX, pullQuoteY, 2, pullQuoteH, "F");

    // Tiny label — "KEY METRIC" in slate, restrained
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    setHex(doc, COLOR.textDim, "text");
    doc.text("KEY METRIC", pullQuoteX + 12, pullQuoteY + 14);

    // The quote itself — bold charcoal-black, roomy line height
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setHex(doc, COLOR.textPrimary, "text");
    const quoteLines = doc.splitTextToSize(section.pull_quote, pullQuoteW - 20);
    quoteLines.slice(0, 3).forEach((line: string, i: number) => {
      doc.text(line, pullQuoteX + 12, pullQuoteY + 30 + i * 13);
    });
  }

  return Math.max(proseY, y - 2 + 50);
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

  // Page 8 renders only when committee prose was successfully generated
  // (and validated). Implies snapshot was also present.
  if (data.committeeProse) {
    drawPage8(doc, data, decision);
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

  // Page 8 renders only when committee prose is provided
  if (data.committeeProse) {
    drawPage8(doc, data, decision);
  }

  const fname = filename ?? `AcquiFlow-Deal-Report-${data.inputs.industry_label?.replace(/\s+/g, "-") ?? "Deal"}-${data.generated_at.toISOString().split("T")[0]}.pdf`;
  doc.save(fname);
}
