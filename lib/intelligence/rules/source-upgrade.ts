// lib/intelligence/rules/source-upgrade.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Source Upgrade Recommendation Generator
//
// CP-3 Module: Produces SourceUpgradeRecommendation objects describing the
// fastest path to closing evidence gaps. Each recommendation carries:
//   - a stable upgrade_id (longitudinal correlation)
//   - the from/to source-type transition
//   - the input/metric affected
//   - a plain-language diligence action
//   - magnitude estimates (null in CP-3, populated in CP-5)
//
// The constitution treats evidence upgrade paths as a first-class engine
// output, not a side effect. The engine should not only identify
// uncertainty — it should identify the fastest path to reducing it.
//
// Design constraints honored:
//   - Pure functions: no module state, no I/O
//   - Stable IDs: upgrade_id namespace is upgrade.{input_category}.{target_source}
//   - Magnitude deferred: estimated_uncertainty_reduction and
//     estimated_evidence_quality_increase are null in CP-3
//   - Personality-agnostic: no references to lender profiles anywhere
// ─────────────────────────────────────────────────────────────────────────────

import type {
  SourceTypeKey,
  MetricKey,
} from "../types";
import type {
  SourceUpgradeRecommendation,
  SourceUpgradeId,
} from "./types";
import { SOURCE_UPGRADE_CATALOGUE_VERSION } from "./types";
import {
  getSourceType,
  resolveSourceStrength,
  meetsSourceMinimum,
} from "../source-types";

// Re-export for downstream consumers.
export { SOURCE_UPGRADE_CATALOGUE_VERSION };

// ─────────────────────────────────────────────────────────────────────────────
// UPGRADE CATALOGUE
// ─────────────────────────────────────────────────────────────────────────────
// A library of standard upgrade recommendations the engine can generate.
// Each entry carries a stable ID so longitudinal queries can correlate
// "users who received this recommendation" vs. outcomes.
//
// Catalogue is structural — not every entry fires on every deal. Rules
// (and other consumers) reference these by ID through generateUpgrade().

interface UpgradeTemplate {
  readonly upgrade_id: SourceUpgradeId;
  readonly target_source: SourceTypeKey;
  readonly applies_to_input: string;
  readonly diligence_action: string;
  /**
   * Which input categories can use this template. Rules query the
   * catalogue by (input, target_source) to find a matching template.
   */
  readonly input_aliases: ReadonlyArray<string>;
}

const UPGRADE_CATALOGUE: ReadonlyArray<UpgradeTemplate> = [
  // ── ADD-BACK INTEGRITY ────────────────────────────────────────────────────
  {
    upgrade_id: "upgrade.addback.bank_statements",
    target_source: "bank_statements",
    applies_to_input: "addback_schedule",
    diligence_action:
      "Request 12 months of bank statements covering the periods in which " +
      "owner-benefit add-backs occurred. Reconcile each material add-back " +
      "line to a corresponding bank-statement transaction.",
    input_aliases: ["addback_schedule", "add_back_integrity", "sde_addbacks"],
  },
  {
    upgrade_id: "upgrade.addback.tax_returns",
    target_source: "tax_returns",
    applies_to_input: "addback_schedule",
    diligence_action:
      "Obtain the past three years of business tax returns (1120, 1120S, " +
      "1065, or Schedule C). Cross-reference owner-compensation and " +
      "discretionary expense categories against the reported SDE add-back " +
      "schedule.",
    input_aliases: ["addback_schedule", "add_back_integrity", "sde_addbacks", "owner_compensation"],
  },
  {
    upgrade_id: "upgrade.addback.payroll_filings",
    target_source: "payroll_filings",
    applies_to_input: "owner_compensation",
    diligence_action:
      "Request 941, W-2, and W-3 filings for the past two years. Validate " +
      "owner-compensation add-backs against actual filed payroll amounts.",
    input_aliases: ["owner_compensation", "addback_schedule", "labor_cost"],
  },

  // ── REVENUE QUALITY ───────────────────────────────────────────────────────
  {
    upgrade_id: "upgrade.revenue.bank_statements",
    target_source: "bank_statements",
    applies_to_input: "revenue",
    diligence_action:
      "Request 12-24 months of business bank statements. Reconcile total " +
      "deposits to reported revenue, isolating non-revenue items (loans, " +
      "transfers, owner contributions).",
    input_aliases: ["revenue", "revenue_quality", "cash_receipts"],
  },
  {
    upgrade_id: "upgrade.revenue.tax_returns",
    target_source: "tax_returns",
    applies_to_input: "revenue",
    diligence_action:
      "Obtain three years of business tax returns. Confirm reported revenue " +
      "matches gross receipts on the tax filings. Investigate any material " +
      "variance between book and tax revenue.",
    input_aliases: ["revenue", "revenue_quality"],
  },
  {
    upgrade_id: "upgrade.revenue.pos_exports",
    target_source: "pos_exports",
    applies_to_input: "revenue",
    diligence_action:
      "Request native exports from the point-of-sale or e-commerce " +
      "platform covering 12-24 months. Verify transaction-level detail " +
      "ties to summarized revenue.",
    input_aliases: ["revenue", "revenue_quality", "transaction_count"],
  },

  // ── CUSTOMER CONCENTRATION ───────────────────────────────────────────────
  {
    upgrade_id: "upgrade.customer_concentration.pos_exports",
    target_source: "pos_exports",
    applies_to_input: "customer_concentration",
    diligence_action:
      "Request a customer-level revenue export from the CRM or billing " +
      "system covering the past three years. Verify top-customer revenue " +
      "share and identify concentration trend.",
    input_aliases: ["customer_concentration", "top_customer_pct", "top_5_customer_pct"],
  },
  {
    upgrade_id: "upgrade.customer_concentration.seller_spreadsheet",
    target_source: "seller_spreadsheet",
    applies_to_input: "customer_concentration",
    diligence_action:
      "If platform export is unavailable, request a seller-prepared " +
      "spreadsheet listing top-10 customers by revenue for the past three " +
      "years, with explicit named-customer detail rather than aggregated " +
      "percentages.",
    input_aliases: ["customer_concentration", "top_customer_pct", "top_5_customer_pct"],
  },

  // ── LABOR / PAYROLL ───────────────────────────────────────────────────────
  {
    upgrade_id: "upgrade.labor.payroll_filings",
    target_source: "payroll_filings",
    applies_to_input: "labor_cost",
    diligence_action:
      "Request 941 filings for the past two years plus most recent state " +
      "unemployment filings. Validate reported labor cost and headcount.",
    input_aliases: ["labor_cost", "labor_retention", "headcount"],
  },

  // ── AR / RECEIVABLES ──────────────────────────────────────────────────────
  {
    upgrade_id: "upgrade.ar.internal_pnl",
    target_source: "internal_pnl",
    applies_to_input: "ar_aging",
    diligence_action:
      "Request an AR aging report from the accounting system covering " +
      "the trailing 18 months, including any write-offs or bad-debt " +
      "adjustments.",
    input_aliases: ["ar_aging", "ar_days", "working_capital_stability"],
  },

  // ── INVENTORY ─────────────────────────────────────────────────────────────
  {
    upgrade_id: "upgrade.inventory.pos_exports",
    target_source: "pos_exports",
    applies_to_input: "inventory_detail",
    diligence_action:
      "Request a perpetual-inventory system export with SKU-level detail " +
      "and aging buckets. Independent physical count preferred for any " +
      "purchase-price-allocation analysis.",
    input_aliases: ["inventory_detail", "inventory_turnover", "inventory_pct_assets", "inventory_behavior_stability"],
  },

  // ── CONTRACTS / RECURRING REVENUE ─────────────────────────────────────────
  {
    upgrade_id: "upgrade.contracts.pos_exports",
    target_source: "pos_exports",
    applies_to_input: "contract_status",
    diligence_action:
      "Request actual signed contracts or a system export listing active " +
      "contracts with start dates, end dates, renewal terms, and " +
      "assignability provisions. Verify recurring-revenue claims against " +
      "contract evidence.",
    input_aliases: ["contract_status", "recurring_revenue_persistence", "recurring_revenue_pct"],
  },

  // ── REIMBURSEMENT / PAYER MIX (healthcare) ───────────────────────────────
  {
    upgrade_id: "upgrade.payer_mix.pos_exports",
    target_source: "pos_exports",
    applies_to_input: "payer_mix",
    diligence_action:
      "Request a practice-management-system export breaking down revenue " +
      "by payer over the past three years. Include rate schedules where " +
      "available. Cash-pay practices should still provide platform " +
      "evidence of patient transaction volume.",
    input_aliases: ["payer_mix", "reimbursement_stability"],
  },

  // ── CAPEX HISTORY ─────────────────────────────────────────────────────────
  {
    upgrade_id: "upgrade.capex.tax_returns",
    target_source: "tax_returns",
    applies_to_input: "capex_history",
    diligence_action:
      "Request three years of business tax returns including Form 4562 " +
      "(depreciation schedule). Build the trailing capex picture and " +
      "compare against EBITDA-to-operating-margin gap.",
    input_aliases: ["capex_history", "capex_stability"],
  },

  // ── BACKLOG (contractor-specific) ─────────────────────────────────────────
  {
    upgrade_id: "upgrade.backlog.pos_exports",
    target_source: "pos_exports",
    applies_to_input: "backlog",
    diligence_action:
      "Request a job-cost system export showing signed-and-pending " +
      "contracts with expected start dates, durations, and contract values. " +
      "Validate that trailing revenue is reproducible from pipeline.",
    input_aliases: ["backlog", "project_pipeline"],
  },

  // ── SERVICE-VS-INSTALL MIX (contractor-specific) ──────────────────────────
  {
    upgrade_id: "upgrade.service_mix.pos_exports",
    target_source: "pos_exports",
    applies_to_input: "service_mix",
    diligence_action:
      "Request a job-cost or service-management system export categorizing " +
      "revenue by service vs. install (and where applicable, by maintenance " +
      "contract vs. one-time work). Verify mix percentages over 24 months.",
    input_aliases: ["service_mix"],
  },

  // ── LEASE TERMS ───────────────────────────────────────────────────────────
  {
    upgrade_id: "upgrade.lease.internal_pnl",
    target_source: "internal_pnl",
    applies_to_input: "lease_terms",
    diligence_action:
      "Request the actual lease document and any landlord communications " +
      "about renewal, rent escalation, or option exercise. Lease economics " +
      "drive durability for location-dependent operating models.",
    input_aliases: ["lease_terms"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return all upgrade templates that apply to the given input alias.
 * Used by rules that need to attach evidence-upgrade recommendations
 * to firings.
 */
export function findUpgradeTemplatesForInput(
  input_alias: string,
): ReadonlyArray<UpgradeTemplate> {
  return UPGRADE_CATALOGUE.filter((t) =>
    t.input_aliases.includes(input_alias),
  );
}

/**
 * Return the strongest available upgrade for the given input — the
 * highest-strength source-type the catalogue knows about. Useful when
 * a rule wants to recommend the single best upgrade rather than the
 * full set.
 */
export function strongestUpgradeForInput(
  input_alias: string,
): UpgradeTemplate | null {
  const matches = findUpgradeTemplatesForInput(input_alias);
  if (matches.length === 0) return null;
  return matches.reduce((best, t) => {
    const bestStrength = resolveSourceStrength(best.target_source);
    const candStrength = resolveSourceStrength(t.target_source);
    return candStrength > bestStrength ? t : best;
  });
}

/**
 * Return the upgrade template with the given stable ID.
 */
export function getUpgradeTemplate(
  upgrade_id: SourceUpgradeId,
): UpgradeTemplate | null {
  return UPGRADE_CATALOGUE.find((t) => t.upgrade_id === upgrade_id) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// RECOMMENDATION GENERATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate one or more upgrade recommendations from a current source state.
 *
 * Inputs:
 *   - input_alias: what input is currently weakly sourced
 *   - actual_source: the current source type (or "unknown" if not provided)
 *   - expected_minimum: the source-type minimum the rule expected
 *
 * Output: an array of SourceUpgradeRecommendation objects. May be empty
 * if no upgrade templates exist for this input. Returns at most one
 * recommendation per available upgrade tier above the current source.
 *
 * Magnitude fields (estimated_uncertainty_reduction,
 * estimated_evidence_quality_increase) are null in CP-3. CP-5 populates
 * them using the propagation math then under development.
 */
export function generateRecommendations(args: {
  input_alias: string;
  actual_source: SourceTypeKey | "unknown";
  expected_minimum: SourceTypeKey;
}): ReadonlyArray<SourceUpgradeRecommendation> {
  const { input_alias, actual_source, expected_minimum } = args;

  // Get all templates relevant to this input
  const templates = findUpgradeTemplatesForInput(input_alias);
  if (templates.length === 0) return [];

  // Filter: only templates whose target_source is stronger than the
  // actual source. If actual is "unknown", treat as verbal_assertion
  // (weakest) so every template qualifies.
  const actualStrength =
    actual_source === "unknown"
      ? resolveSourceStrength("verbal_assertion")
      : resolveSourceStrength(actual_source);

  const upgradeable = templates.filter(
    (t) => resolveSourceStrength(t.target_source) > actualStrength,
  );

  // Also include the expected_minimum if it's not already in upgradeable
  // and is itself stronger than actual. This guarantees the recommendation
  // set includes at least the source the rule said it needs.
  const expectedMinStrength = resolveSourceStrength(expected_minimum);
  const hasExpectedMin = upgradeable.some(
    (t) => t.target_source === expected_minimum,
  );
  if (!hasExpectedMin && expectedMinStrength > actualStrength) {
    // No matching template for the expected minimum — generate an ad-hoc
    // recommendation. This keeps the contract that unsupported_by_evidence
    // firings always carry at least one recommendation.
    upgradeable.push({
      upgrade_id: `upgrade.${input_alias}.${expected_minimum}`,
      target_source: expected_minimum,
      applies_to_input: input_alias,
      diligence_action: buildGenericDiligenceAction(input_alias, expected_minimum),
      input_aliases: [input_alias],
    });
  }

  // Convert templates to recommendations. Magnitudes null in CP-3.
  return upgradeable.map((t) => ({
    upgrade_id: t.upgrade_id,
    from_source: actual_source,
    to_source: t.target_source,
    applies_to_input: t.applies_to_input,
    diligence_action: t.diligence_action,
    estimated_uncertainty_reduction: null,
    estimated_evidence_quality_increase: null,
  }));
}

/**
 * Single-best recommendation — convenience wrapper for rules that want
 * to attach the strongest available upgrade rather than the full ladder.
 */
export function generateBestRecommendation(args: {
  input_alias: string;
  actual_source: SourceTypeKey | "unknown";
  expected_minimum: SourceTypeKey;
}): SourceUpgradeRecommendation | null {
  const all = generateRecommendations(args);
  if (all.length === 0) return null;
  return all.reduce((best, r) => {
    const bestStrength = resolveSourceStrength(best.to_source);
    const candStrength = resolveSourceStrength(r.to_source);
    return candStrength > bestStrength ? r : best;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: GENERIC DILIGENCE ACTION BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildGenericDiligenceAction(
  input_alias: string,
  target_source: SourceTypeKey,
): string {
  const targetType = getSourceType(target_source);
  const targetName = targetType?.name ?? target_source;
  return (
    `Request ${targetName.toLowerCase()} covering the ${input_alias} ` +
    `claim. The current evidence sits below the source-type minimum for ` +
    `this metric; obtaining ${targetName.toLowerCase()} would materially ` +
    `increase confidence.`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOGUE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export interface SourceUpgradeCatalogueValidationResult {
  readonly ok: boolean;
  readonly issues: Array<{
    severity: "error" | "warning";
    location: string;
    message: string;
  }>;
  readonly upgrade_count: number;
  readonly version: string;
}

export function validateSourceUpgradeCatalogue(): SourceUpgradeCatalogueValidationResult {
  const issues: Array<{ severity: "error" | "warning"; location: string; message: string }> = [];

  // Unique upgrade IDs
  const seenIds = new Set<string>();
  for (const t of UPGRADE_CATALOGUE) {
    if (seenIds.has(t.upgrade_id)) {
      issues.push({
        severity: "error",
        location: `upgrade[${t.upgrade_id}]`,
        message: `Duplicate upgrade_id`,
      });
    }
    seenIds.add(t.upgrade_id);
  }

  // Each upgrade_id must match the stable-ID convention
  for (const t of UPGRADE_CATALOGUE) {
    if (!/^upgrade\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(t.upgrade_id)) {
      issues.push({
        severity: "error",
        location: `upgrade[${t.upgrade_id}].upgrade_id`,
        message: `Upgrade ID must match pattern upgrade.{input}.{target_source}`,
      });
    }
  }

  // target_source must be a known SourceTypeKey
  for (const t of UPGRADE_CATALOGUE) {
    if (!getSourceType(t.target_source)) {
      issues.push({
        severity: "error",
        location: `upgrade[${t.upgrade_id}].target_source`,
        message: `Unknown SourceTypeKey: ${t.target_source}`,
      });
    }
  }

  // Each template must have at least one input alias and a non-trivial action
  for (const t of UPGRADE_CATALOGUE) {
    if (t.input_aliases.length === 0) {
      issues.push({
        severity: "error",
        location: `upgrade[${t.upgrade_id}].input_aliases`,
        message: `At least one input alias required`,
      });
    }
    if (!t.diligence_action || t.diligence_action.trim().length < 30) {
      issues.push({
        severity: "error",
        location: `upgrade[${t.upgrade_id}].diligence_action`,
        message: `Diligence action missing or too short`,
      });
    }
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  return {
    ok: errors === 0,
    issues,
    upgrade_count: UPGRADE_CATALOGUE.length,
    version: SOURCE_UPGRADE_CATALOGUE_VERSION,
  };
}

function assertSourceUpgradeCatalogueValid(): void {
  const result = validateSourceUpgradeCatalogue();
  if (!result.ok) {
    const errorList = result.issues
      .filter((i) => i.severity === "error")
      .map((i) => `  [${i.location}] ${i.message}`)
      .join("\n");
    throw new Error(
      `Source upgrade catalogue validation failed (${SOURCE_UPGRADE_CATALOGUE_VERSION}):\n${errorList}`,
    );
  }
}

// Fail-closed at load time.
assertSourceUpgradeCatalogueValid();

// ─────────────────────────────────────────────────────────────────────────────
// SUPPRESS UNUSED IMPORT WARNINGS
// ─────────────────────────────────────────────────────────────────────────────
// MetricKey and meetsSourceMinimum are exported here for downstream
// consumers that re-import from this module. Touch them so strict
// TypeScript doesn't flag them as unused.
const _suppress_unused: MetricKey | undefined = undefined;
void _suppress_unused;
void meetsSourceMinimum;
