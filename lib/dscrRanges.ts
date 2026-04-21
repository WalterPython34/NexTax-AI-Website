// lib/dscrRanges.ts
// Per-industry DSCR thresholds for NexTax underwriting panel.
// Replaces hardcoded 1.0 / 1.5 / 2.5 values.

export interface DscrRange {
  /** Below this: deal cannot service standard debt */
  weak:       number;
  /** Below this: below typical lender minimum (1.25x for SBA) */
  acceptable: number;
  /** At or above this: strong coverage headroom */
  strong:     number;
}

// Industry-specific DSCR ranges.
// Logic: service businesses with high owner involvement accept tighter coverage;
// asset-heavy or recurring-revenue models are underwritten more conservatively.
export const DSCR_RANGES: Record<string, DscrRange> = {
  // Tight-margin service (restaurants, quick-service)
  food_beverage:        { weak: 1.0,  acceptable: 1.20, strong: 1.5 },
  // Field services — variable seasonality
  field_services:       { weak: 1.0,  acceptable: 1.25, strong: 1.6 },
  specialty_trade:      { weak: 1.0,  acceptable: 1.25, strong: 1.6 },
  auto_services:        { weak: 1.0,  acceptable: 1.25, strong: 1.5 },
  // Healthcare / med spa — higher capex, cash-pay model
  healthcare_clinical:  { weak: 1.1,  acceptable: 1.30, strong: 1.7 },
  med_spa:              { weak: 1.1,  acceptable: 1.30, strong: 1.7 },
  behavioral_health:    { weak: 1.05, acceptable: 1.25, strong: 1.6 },
  physical_therapy:     { weak: 1.05, acceptable: 1.25, strong: 1.6 },
  // Personal services (salon, laundry) — owner-heavy, low barrier
  personal_services:    { weak: 1.0,  acceptable: 1.20, strong: 1.5 },
  hairsalon:            { weak: 1.0,  acceptable: 1.20, strong: 1.5 },
  // Professional services — less capital, reliable revenue
  professional_services:{ weak: 1.0,  acceptable: 1.25, strong: 1.6 },
  marketing:            { weak: 1.0,  acceptable: 1.25, strong: 1.6 },
  engineering:          { weak: 1.0,  acceptable: 1.25, strong: 1.6 },
  staffing:             { weak: 1.0,  acceptable: 1.30, strong: 1.7 },
  // Asset-heavy / recurring
  asset_services:       { weak: 1.1,  acceptable: 1.35, strong: 1.8 },
  propertymanage:       { weak: 1.1,  acceptable: 1.30, strong: 1.7 },
  realestatebrok:       { weak: 1.0,  acceptable: 1.25, strong: 1.6 },
  // Inventory-heavy retail / grocery
  retail:               { weak: 1.0,  acceptable: 1.25, strong: 1.6 },
  grocery:              { weak: 1.0,  acceptable: 1.20, strong: 1.5 },
  clothing:             { weak: 1.0,  acceptable: 1.25, strong: 1.6 },
  // SaaS / digital — high margins, predictable
  saas:                 { weak: 1.1,  acceptable: 1.30, strong: 2.0 },
  digital:              { weak: 1.0,  acceptable: 1.25, strong: 1.8 },
  // Manufacturing / wholesale — capital-intensive
  manufacturing:        { weak: 1.1,  acceptable: 1.35, strong: 1.8 },
  wholesale:            { weak: 1.0,  acceptable: 1.30, strong: 1.7 },
  construction:         { weak: 1.0,  acceptable: 1.30, strong: 1.7 },
  // Senior / home care — regulatory risk
  seniorcare:           { weak: 1.1,  acceptable: 1.30, strong: 1.7 },
  veterinary:           { weak: 1.1,  acceptable: 1.30, strong: 1.7 },
  // Misc
  pestcontrol:          { weak: 1.0,  acceptable: 1.25, strong: 1.6 },
  signmaking:           { weak: 1.0,  acceptable: 1.25, strong: 1.5 },
  remodeling:           { weak: 1.0,  acceptable: 1.25, strong: 1.6 },
};

const DEFAULT_DSCR: DscrRange = { weak: 1.0, acceptable: 1.25, strong: 1.5 };

/** Get the DSCR range for a given NexTax industry key. */
export function getDscrRange(industryKey: string | null | undefined): DscrRange {
  if (!industryKey) return DEFAULT_DSCR;
  return DSCR_RANGES[industryKey.toLowerCase()] ?? DEFAULT_DSCR;
}

/** Human-readable coverage assessment. */
export function dscrAssessment(dscr: number, range: DscrRange): {
  label: "critical" | "weak" | "acceptable" | "strong";
  message: string;
} {
  if (dscr < range.weak) return {
    label: "critical",
    message: `DSCR of ${dscr.toFixed(2)}x — cannot service standard debt at current terms. Financing is not viable.`,
  };
  if (dscr < range.acceptable) return {
    label: "weak",
    message: `DSCR of ${dscr.toFixed(2)}x — below the typical ${range.acceptable}x lender minimum. Financing at risk without equity injection.`,
  };
  if (dscr < range.strong) return {
    label: "acceptable",
    message: `DSCR of ${dscr.toFixed(2)}x — meets minimum lender thresholds but leaves limited headroom.`,
  };
  return {
    label: "strong",
    message: `DSCR of ${dscr.toFixed(2)}x — solid debt coverage with meaningful headroom above lender minimums.`,
  };
}

/*
// WIRING in buyer-dashboard.tsx — update buildBenchmarkContext():
// REPLACE the hardcoded dscrLow/Median/High values with:

import { getDscrRange } from "@/lib/dscrRanges";

// Inside buildBenchmarkContext(deal):
  const dscrRange = getDscrRange(deal.industry);
  return {
    ...
    dscrLow:    dscrRange.weak,
    dscrMedian: dscrRange.acceptable,
    dscrHigh:   dscrRange.strong,
  };

// And in CompsTab RangeBar note for DSCR, update the thresholds dynamically:
// The note already reads from normalization.currentDscr — it will auto-update
// once dscrRange values flow through.
*/
