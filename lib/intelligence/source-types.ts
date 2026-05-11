// lib/intelligence/source-types.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Underwriting Intelligence Engine — Evidence Source Hierarchy
//
// CP-2 Module: Source-type taxonomy with 7-tier granularity, 4-band rollup,
// and independence classification. The evidence_source_strength sub-axis of
// evidence_quality reads from this module.
//
// Institutional underwriting does not treat all "documented" evidence as
// equivalent. A bank statement is not a POS export is not an internal P&L
// is not a seller spreadsheet — even when each contains the same number.
//
// See Section 2 of the Underwriting Constitution for the full rationale.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  SourceType,
  SourceTypeKey,
  SourceBand,
  SourceIndependence,
} from "./types";
import { SOURCE_TYPE_REGISTRY_VERSION } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// THE SEVEN GRANULAR SOURCE TYPES
// ─────────────────────────────────────────────────────────────────────────────
// Ordered from strongest to weakest. Strength score anchors the
// evidence_source_strength sub-axis; band provides the simpler UI rollup;
// independence drives lender-personality fraud-risk weighting.

export const SOURCE_TYPES: ReadonlyArray<SourceType> = [
  // ── 1. TAX RETURNS — strength 95 ──────────────────────────────────────────
  {
    key: "tax_returns",
    name: "Tax Returns",
    band: "verified",
    independence: "independent",
    auditability: "high",
    manipulability: "low",
    survivability: "high",
    strength_score: 95,
    description:
      "IRS-filed business returns (1120, 1120S, 1065, Schedule C). " +
      "Independent — IRS-filed and CPA-attested in most cases. Subject to " +
      "perjury exposure on the seller side. The institutional gold standard " +
      "for SDE, revenue, and add-back baseline.",
    typical_for: ["revenue", "sde", "ebitda", "operating_margin", "owner_compensation"],
    weakness_notes:
      "Cash-basis reporting may understate accrual revenue; aggressive " +
      "deductions reduce reported earnings (which the SDE add-back recovers, " +
      "but the recovery itself becomes the diligence question).",
  },

  // ── 2. BANK STATEMENTS — strength 90 ──────────────────────────────────────
  {
    key: "bank_statements",
    name: "Bank Statements",
    band: "verified",
    independence: "independent",
    auditability: "high",
    manipulability: "very_low",
    survivability: "high",
    strength_score: 90,
    description:
      "Bank-issued account statements. Independent of seller production. " +
      "Direct evidence of cash flow timing and quantum. Cannot be " +
      "retroactively manipulated without bank involvement (essentially " +
      "fraud-level risk for the seller).",
    typical_for: ["revenue", "cash_receipts", "owner_distributions", "debt_service"],
    weakness_notes:
      "Captures cash flow, not earnings. Deposits include non-revenue items " +
      "(loans, owner contributions, transfers). Requires reconciliation to " +
      "isolate operating revenue.",
  },

  // ── 3. PAYROLL FILINGS — strength 90 ──────────────────────────────────────
  {
    key: "payroll_filings",
    name: "Payroll Filings",
    band: "verified",
    independence: "independent",
    auditability: "high",
    manipulability: "very_low",
    survivability: "high",
    strength_score: 90,
    description:
      "941, W-2/W-3, state unemployment, workers' comp filings. Independent " +
      "of seller production. Direct evidence of payroll expense, headcount, " +
      "and owner compensation.",
    typical_for: ["payroll_expense", "headcount", "owner_compensation", "labor_cost"],
    weakness_notes:
      "1099 workers not captured here; contractor payments live elsewhere. " +
      "Owner W-2 may understate true owner take if distributions are " +
      "substantial.",
  },

  // ── 4. POS / PLATFORM EXPORTS — strength 75 ───────────────────────────────
  {
    key: "pos_exports",
    name: "POS / Platform Exports",
    band: "documented",
    independence: "semi_independent",
    auditability: "high",
    manipulability: "low",
    survivability: "moderate",
    strength_score: 75,
    description:
      "Direct exports from point-of-sale systems (Square, Toast, Lightspeed), " +
      "e-commerce platforms (Shopify, Amazon Seller Central), or " +
      "industry-specific software. System-generated, transaction-level " +
      "detail. Semi-independent — the system is third-party but the seller " +
      "controls what's reconciled.",
    typical_for: ["revenue", "transaction_count", "customer_count", "product_mix", "average_ticket"],
    weakness_notes:
      "May not capture cash sales or off-platform revenue. Refund and void " +
      "treatment varies by system. Long-term archive availability depends " +
      "on subscription continuity.",
  },

  // ── 5. INTERNAL P&L / ACCOUNTING SOFTWARE — strength 55 ───────────────────
  {
    key: "internal_pnl",
    name: "Internal P&L / Accounting Software",
    band: "seller_prepared",
    independence: "seller_controlled",
    auditability: "moderate",
    manipulability: "moderate",
    survivability: "moderate",
    strength_score: 55,
    description:
      "QuickBooks, Xero, or similar accounting-software outputs. " +
      "Seller-controlled — categorization, classification, and timing all " +
      "reflect seller decisions. Auditable in the sense that transactions " +
      "can be traced, but interpretation is seller-led.",
    typical_for: ["revenue", "cogs", "operating_expenses", "ebitda", "ar", "ap", "inventory"],
    weakness_notes:
      "Misclassification is common (personal expenses, capitalization vs " +
      "expense, accrual treatment). Year-end adjustments may not flow " +
      "through. Reconciliation to tax returns is the standard verification " +
      "path.",
  },

  // ── 6. SELLER-PREPARED SPREADSHEET — strength 30 ──────────────────────────
  {
    key: "seller_spreadsheet",
    name: "Seller-Prepared Spreadsheet",
    band: "seller_prepared",
    independence: "seller_controlled",
    auditability: "low",
    manipulability: "high",
    survivability: "low",
    strength_score: 30,
    description:
      "Excel or Google Sheets prepared by the seller specifically for the " +
      "sale process. Seller-controlled in every dimension. May aggregate " +
      "from underlying systems but the aggregation logic is opaque to the " +
      "buyer.",
    typical_for: ["addback_schedule", "customer_concentration", "ar_aging", "inventory_detail", "projections"],
    weakness_notes:
      "Selection bias is the dominant risk — sellers include flattering " +
      "data, exclude unflattering data. Formulas can hide adjustments. No " +
      "audit trail to underlying source unless explicitly provided.",
  },

  // ── 7. VERBAL / UNDOCUMENTED ASSERTION — strength 10 ──────────────────────
  {
    key: "verbal_assertion",
    name: "Verbal / Undocumented Assertion",
    band: "asserted",
    independence: "seller_controlled",
    auditability: "none",
    manipulability: "very_high",
    survivability: "none",
    strength_score: 10,
    description:
      "Claims made in conversation, broker memorandum, or unsupported by " +
      "any document. No verification path. Treated as a hypothesis to be " +
      "confirmed, not as evidence.",
    typical_for: ["customer_concentration", "recurring_revenue_pct", "growth_assumptions", "competitive_position"],
    weakness_notes:
      "Every verbal claim should be tracked as a diligence item to convert " +
      "to documented evidence. Conclusions that rest on verbal assertions " +
      "carry maximum underwriting uncertainty.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// BAND ROLLUP — UI simplicity layer
// ─────────────────────────────────────────────────────────────────────────────

export const SOURCE_BANDS: ReadonlyArray<{
  readonly band: SourceBand;
  readonly independence: string;
  readonly manipulability: string;
  readonly treatment: string;
}> = [
  {
    band: "verified",
    independence: "Independent (third-party-produced or third-party-attested)",
    manipulability: "Very low (would require coordinated fraud)",
    treatment: "Highest trust. Anchors the analysis. Source for conclusions.",
  },
  {
    band: "documented",
    independence: "Semi-independent (system-generated but seller controls what's reconciled)",
    manipulability: "Low (technical evidence can be cross-checked)",
    treatment: "High trust with verification path. Often the practical anchor for operational metrics.",
  },
  {
    band: "seller_prepared",
    independence: "Seller-controlled (categorization, classification, timing)",
    manipulability: "Moderate (subject to selection bias, misclassification)",
    treatment: "Moderate trust. Requires reconciliation to a verified or documented source to anchor conclusions.",
  },
  {
    band: "asserted",
    independence: "Seller-controlled (no documentation)",
    manipulability: "Very high (selection bias, unverifiable)",
    treatment: "Treated as hypothesis, not evidence. Triggers diligence items and uncertainty flags.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the SourceType for a given key, or null if unknown.
 *
 * Internal-precision API. Higher-level consumers should use
 * resolveSourceStrength() for fallback-aware behavior.
 */
export function getSourceType(key: SourceTypeKey): SourceType | null {
  return SOURCE_TYPES.find((s) => s.key === key) ?? null;
}

/**
 * Return strength score for a source type. Used by evidence_source_strength
 * computation in CP-5.
 *
 * Falls back to verbal_assertion (10) if unknown source type provided —
 * fail-low, never fail-high.
 */
export function resolveSourceStrength(key: SourceTypeKey | string | null | undefined): number {
  if (!key) return 10;
  const found = SOURCE_TYPES.find((s) => s.key === (key as SourceTypeKey));
  return found?.strength_score ?? 10;
}

/**
 * Map a source type to its band. Useful for UI consumers that don't need
 * 7-tier granularity.
 */
export function sourceTypeToBand(key: SourceTypeKey): SourceBand | null {
  return getSourceType(key)?.band ?? null;
}

/**
 * Return all source types that match the given band, ordered by strength.
 */
export function sourceTypesInBand(band: SourceBand): ReadonlyArray<SourceType> {
  return SOURCE_TYPES.filter((s) => s.band === band)
    .slice()
    .sort((a, b) => b.strength_score - a.strength_score);
}

/**
 * Return all source types with the given independence classification.
 * Used by lender-personality weighting (CP-6) to distinguish independent
 * sources from seller-controlled sources within the same band.
 */
export function sourceTypesByIndependence(
  independence: SourceIndependence,
): ReadonlyArray<SourceType> {
  return SOURCE_TYPES.filter((s) => s.independence === independence);
}

/**
 * Compare two source types and return whether `a` is stronger, equal, or
 * weaker than `b`. Used to evaluate whether an actual source meets an
 * expected source minimum.
 */
export function compareSourceStrength(a: SourceTypeKey, b: SourceTypeKey): -1 | 0 | 1 {
  const sa = resolveSourceStrength(a);
  const sb = resolveSourceStrength(b);
  if (sa > sb) return 1;
  if (sa < sb) return -1;
  return 0;
}

/**
 * Check whether `actual` source meets or exceeds `expected_minimum`.
 * Returns true if `actual` is at least as strong as `expected_minimum`.
 */
export function meetsSourceMinimum(
  actual: SourceTypeKey,
  expected_minimum: SourceTypeKey,
): boolean {
  return compareSourceStrength(actual, expected_minimum) >= 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

interface SourceTypeValidationResult {
  readonly ok: boolean;
  readonly issues: Array<{ severity: "error" | "warning"; location: string; message: string }>;
  readonly count: number;
  readonly version: string;
}

/**
 * Validate the source-types registry. Runs at module load via
 * assertSourceTypesValid() — throws on validation failure. Also callable
 * externally for diagnostic reporting.
 */
export function validateSourceTypes(): SourceTypeValidationResult {
  const issues: Array<{ severity: "error" | "warning"; location: string; message: string }> = [];

  // Check for duplicate keys
  const seenKeys = new Set<string>();
  for (const s of SOURCE_TYPES) {
    if (seenKeys.has(s.key)) {
      issues.push({
        severity: "error",
        location: `source_type[${s.key}]`,
        message: `Duplicate source type key: ${s.key}`,
      });
    }
    seenKeys.add(s.key);
  }

  // Check strength scores are 0-100
  for (const s of SOURCE_TYPES) {
    if (s.strength_score < 0 || s.strength_score > 100) {
      issues.push({
        severity: "error",
        location: `source_type[${s.key}].strength_score`,
        message: `Strength score must be 0-100, got ${s.strength_score}`,
      });
    }
  }

  // Check strength ordering — verified should always be > documented > seller_prepared > asserted
  const bandStrengths: Record<SourceBand, number[]> = {
    verified: [],
    documented: [],
    seller_prepared: [],
    asserted: [],
  };
  for (const s of SOURCE_TYPES) {
    bandStrengths[s.band].push(s.strength_score);
  }
  const verifiedMin = Math.min(...bandStrengths.verified);
  const documentedMax = bandStrengths.documented.length > 0 ? Math.max(...bandStrengths.documented) : -Infinity;
  const documentedMin = bandStrengths.documented.length > 0 ? Math.min(...bandStrengths.documented) : Infinity;
  const sellerPreparedMax = bandStrengths.seller_prepared.length > 0 ? Math.max(...bandStrengths.seller_prepared) : -Infinity;
  const sellerPreparedMin = bandStrengths.seller_prepared.length > 0 ? Math.min(...bandStrengths.seller_prepared) : Infinity;
  const assertedMax = bandStrengths.asserted.length > 0 ? Math.max(...bandStrengths.asserted) : -Infinity;

  if (documentedMax >= verifiedMin) {
    issues.push({
      severity: "error",
      location: "band_strength_ordering",
      message: `documented band max (${documentedMax}) must be < verified band min (${verifiedMin})`,
    });
  }
  if (sellerPreparedMax >= documentedMin && bandStrengths.documented.length > 0) {
    issues.push({
      severity: "error",
      location: "band_strength_ordering",
      message: `seller_prepared band max (${sellerPreparedMax}) must be < documented band min (${documentedMin})`,
    });
  }
  if (assertedMax >= sellerPreparedMin && bandStrengths.seller_prepared.length > 0) {
    issues.push({
      severity: "error",
      location: "band_strength_ordering",
      message: `asserted band max (${assertedMax}) must be < seller_prepared band min (${sellerPreparedMin})`,
    });
  }

  // Independence classification sanity check — verified sources should always
  // be independent; asserted sources should always be seller_controlled.
  for (const s of SOURCE_TYPES) {
    if (s.band === "verified" && s.independence !== "independent") {
      issues.push({
        severity: "error",
        location: `source_type[${s.key}].independence`,
        message: `Verified-band source must be independent, got ${s.independence}`,
      });
    }
    if (s.band === "asserted" && s.independence !== "seller_controlled") {
      issues.push({
        severity: "error",
        location: `source_type[${s.key}].independence`,
        message: `Asserted-band source must be seller_controlled, got ${s.independence}`,
      });
    }
  }

  // Each source type must have at least one typical_for entry
  for (const s of SOURCE_TYPES) {
    if (s.typical_for.length === 0) {
      issues.push({
        severity: "warning",
        location: `source_type[${s.key}].typical_for`,
        message: "Empty typical_for list — source type has no documented use case",
      });
    }
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  return {
    ok: errors === 0,
    issues,
    count: SOURCE_TYPES.length,
    version: SOURCE_TYPE_REGISTRY_VERSION,
  };
}

/**
 * Runs at module import time. Throws if the registry has structural errors.
 * Institutional systems fail closed — the engine should never start with
 * a misconfigured source-type registry.
 */
function assertSourceTypesValid(): void {
  const result = validateSourceTypes();
  if (!result.ok) {
    const errorList = result.issues
      .filter((i) => i.severity === "error")
      .map((i) => `  [${i.location}] ${i.message}`)
      .join("\n");
    throw new Error(
      `Source-types registry validation failed (${SOURCE_TYPE_REGISTRY_VERSION}):\n${errorList}`,
    );
  }
}

// Fail-closed at load time.
assertSourceTypesValid();
