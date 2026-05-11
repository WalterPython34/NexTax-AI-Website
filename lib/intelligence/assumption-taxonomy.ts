// lib/intelligence/assumption-taxonomy.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Underwriting Intelligence Engine — Shared Assumption Taxonomy
//
// CP-2 Module: The 15 first-class assumptions that underpin every rule,
// scenario, and durability calculation. Dependency concentration analysis
// (assumption_fragility axis) reads from this taxonomy.
//
// Assumptions are first-class objects — not strings emitted ad hoc by rules.
// This is the foundation that makes "how many assumptions must remain true
// simultaneously" measurable.
//
// See Section 3 of the Underwriting Constitution.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Assumption,
  AssumptionKey,
  MemoryRole,
} from "./types";
import {
  ASSUMPTION_TAXONOMY_VERSION,
  MODEL_UNCERTAINTY_PRINCIPLE,
  SNAPSHOT_AS_MEMORY_PRINCIPLE,
} from "./types";

// Re-export the narrative principles so consumers have a single import.
export { MODEL_UNCERTAINTY_PRINCIPLE, SNAPSHOT_AS_MEMORY_PRINCIPLE };

// ─────────────────────────────────────────────────────────────────────────────
// THE FIFTEEN ASSUMPTIONS
// ─────────────────────────────────────────────────────────────────────────────
// Adding a new assumption is governed: the rule that references it must
// justify the addition, and existing rules referencing related concepts
// must be reviewed for absorption. Drift in this taxonomy is what causes
// fragility logic to lose meaning.
//
// Memory roles:
//   memory_pattern_relevant: failure patterns aggregate predictively across
//   deals. Feed CP-9+ longitudinal queries.
//
//   deal_specific: meaningful for the deal but doesn't aggregate
//   predictively.

export const ASSUMPTIONS: ReadonlyArray<Assumption> = [
  // ── 1. ADD-BACK INTEGRITY ─────────────────────────────────────────────────
  {
    key: "add_back_integrity",
    name: "Add-back integrity",
    definition:
      "Owner add-backs reported to compute SDE are verifiable against " +
      "contemporaneous documentation (payroll, P&L line items, bank statements).",
    failure_consequence:
      "SDE compresses; valuation multiple compresses; coverage compresses.",
    typical_strength:
      "Most validated through CPA-prepared QoE work and trailing-twelve-month tax returns.",
    memory_role: "memory_pattern_relevant",
  },

  // ── 2. REVENUE QUALITY ────────────────────────────────────────────────────
  // Promoted to memory_pattern_relevant — revenue quality deterioration
  // patterns are highly longitudinal and extremely valuable for future
  // underwriting intelligence (recurring concentration drift, customer
  // volatility trends, acquisition-channel instability).
  {
    key: "revenue_quality",
    name: "Revenue quality",
    definition:
      "Reported revenue reflects accrual-basis recurring activity rather " +
      "than one-time events, channel stuffing, or aggressive recognition.",
    failure_consequence:
      "Trailing revenue overstates run-rate; valuation thesis weakens.",
    typical_strength:
      "Confirmed through cash-to-revenue reconciliation and customer-by-customer attribution.",
    memory_role: "memory_pattern_relevant",
  },

  // ── 3. CUSTOMER RETENTION ─────────────────────────────────────────────────
  {
    key: "customer_retention",
    name: "Customer retention through transition",
    definition:
      "Top customers continue purchasing post-close at pre-close volumes " +
      "and pricing, particularly through ownership change.",
    failure_consequence:
      "Revenue compression in months 6–18 post-close; coverage compression.",
    typical_strength:
      "Protected through earn-out structure, contract assignability review, and seller transition incentives.",
    memory_role: "memory_pattern_relevant",
  },

  // ── 4. KEY-PERSON TRANSFERABILITY ─────────────────────────────────────────
  {
    key: "key_person_transferability",
    name: "Key-person transferability",
    definition:
      "Customer relationships, vendor relationships, and operational " +
      "know-how transfer cleanly to the buyer or remaining team rather " +
      "than walking with the seller.",
    failure_consequence:
      "Operating disruption in months 0–12 post-close; potential customer loss.",
    typical_strength:
      "Tested through 90-day transition, documented SOPs, and second-in-command interviews.",
    memory_role: "memory_pattern_relevant",
  },

  // ── 5. LABOR RETENTION ────────────────────────────────────────────────────
  {
    key: "labor_retention",
    name: "Labor retention",
    definition:
      "Hourly and technician-level employees remain through the transition " +
      "rather than leaving for competitors.",
    failure_consequence:
      "Capacity constraints, cost inflation, service quality drops.",
    typical_strength:
      "Mitigated through retention bonuses, wage benchmarking, and tenure analysis pre-close.",
    memory_role: "memory_pattern_relevant",
  },

  // ── 6. SUPPLIER STABILITY ─────────────────────────────────────────────────
  {
    key: "supplier_stability",
    name: "Supplier stability",
    definition:
      "Primary suppliers, vendors, or franchisors maintain terms, pricing, " +
      "and continuity through ownership change.",
    failure_consequence:
      "COGS inflation; supply disruption; potential business model failure.",
    typical_strength:
      "Confirmed through supplier interviews and contract assignment review.",
    memory_role: "memory_pattern_relevant",
  },

  // ── 7. WORKING CAPITAL STABILITY ──────────────────────────────────────────
  {
    key: "working_capital_stability",
    name: "Working capital stability",
    definition:
      "AR, AP, and inventory cycles remain steady post-close rather than " +
      "requiring incremental working capital draws.",
    failure_consequence: "Cash crunch in months 3–9 post-close; revolver requirement.",
    typical_strength:
      "Pressure-tested through trailing twelve-month working capital walk and seasonality review.",
    memory_role: "memory_pattern_relevant",
  },

  // ── 8. INVENTORY BEHAVIOR STABILITY ───────────────────────────────────────
  {
    key: "inventory_behavior_stability",
    name: "Inventory behavior stability",
    definition:
      "Inventory turnover, mix, and obsolescence patterns remain consistent " +
      "post-close.",
    failure_consequence:
      "Gross margin compression through obsolescence write-offs or mix shift.",
    typical_strength: "Confirmed through SKU-level analysis and historical write-off review.",
    memory_role: "memory_pattern_relevant",
  },

  // ── 9. PRICING POWER ──────────────────────────────────────────────────────
  {
    key: "pricing_power",
    name: "Pricing power",
    definition:
      "Buyer can maintain or modestly increase pricing without losing " +
      "customer base, particularly to absorb wage or material inflation.",
    failure_consequence: "Margin compression; coverage compression.",
    typical_strength:
      "Tested through price history review and competitive positioning analysis.",
    memory_role: "memory_pattern_relevant",
  },

  // ── 10. MARGIN SUSTAINABILITY ─────────────────────────────────────────────
  {
    key: "margin_sustainability",
    name: "Margin sustainability",
    definition:
      "Trailing operating margins reflect steady-state operations rather " +
      "than a moment in the cycle, abnormal cost deferral, or revenue mix anomaly.",
    failure_consequence:
      "Reported earnings overstate run-rate; coverage compression at normalized margins.",
    typical_strength:
      "Confirmed through multi-year margin walk and peer-band comparison.",
    memory_role: "memory_pattern_relevant",
  },

  // ── 11. RECURRING REVENUE PERSISTENCE ─────────────────────────────────────
  {
    key: "recurring_revenue_persistence",
    name: "Recurring revenue persistence",
    definition:
      "Contracted, subscription, or routinely recurring revenue maintains " +
      "its frequency and dollar value post-close.",
    failure_consequence:
      "Reported revenue stability becomes project-based volatility.",
    typical_strength:
      "Validated through contract review, churn analysis, and customer cohort analysis.",
    memory_role: "memory_pattern_relevant",
  },

  // ── 12. CAPEX STABILITY ───────────────────────────────────────────────────
  {
    key: "capex_stability",
    name: "Capex stability",
    definition:
      "Maintenance capex remains predictable; no deferred capital expenditure " +
      "that catches up post-close.",
    failure_consequence:
      "Free cash flow compression beyond stated D&A; coverage erodes against actual cash burden.",
    typical_strength:
      "Tested through asset inspection, useful-life analysis, and deferred-maintenance review.",
    memory_role: "memory_pattern_relevant",
  },

  // ── 13. REIMBURSEMENT STABILITY ───────────────────────────────────────────
  {
    key: "reimbursement_stability",
    name: "Reimbursement stability",
    definition:
      "Payer mix and reimbursement rates remain steady post-close; no " +
      "expected payer policy or rate cuts.",
    failure_consequence: "Revenue compression independent of volume.",
    typical_strength:
      "Confirmed through payer-mix analysis and rate-card review (healthcare-specific).",
    memory_role: "memory_pattern_relevant",
  },

  // ── 14. COVENANT HEADROOM ─────────────────────────────────────────────────
  // Deal-specific: covenant terms vary per loan; failure patterns don't
  // aggregate predictively across the population.
  {
    key: "covenant_headroom",
    name: "Covenant headroom",
    definition:
      "Modeled DSCR and leverage maintain sufficient buffer against lender " +
      "covenants under conservative earnings cases.",
    failure_consequence:
      "Technical default events even when operating cash flow is positive.",
    typical_strength: "Stressed via multi-scenario sensitivity modeling pre-LOI.",
    memory_role: "deal_specific",
  },

  // ── 15. TRANSITION EXECUTION ──────────────────────────────────────────────
  // Deal-specific: transition planning is buyer-specific; outcome patterns
  // are dominated by buyer skill rather than industry/operating-model patterns.
  {
    key: "transition_execution",
    name: "Transition execution",
    definition:
      "Buyer successfully assumes operational control during the " +
      "seller-handoff window without material disruption.",
    failure_consequence:
      "Operating chaos in months 0–6 post-close; customer attrition; employee loss.",
    typical_strength:
      "Designed through documented 90-day plan, retained seller advisory, and cross-training.",
    memory_role: "deal_specific",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Look up assumption by key. Returns null if unknown — assumption keys are
 * controlled by the union type, so unknown keys at runtime indicate a bug.
 */
export function getAssumption(key: AssumptionKey): Assumption | null {
  return ASSUMPTIONS.find((a) => a.key === key) ?? null;
}

/**
 * Return all assumptions with the given memory role.
 */
export function assumptionsByMemoryRole(role: MemoryRole): ReadonlyArray<Assumption> {
  return ASSUMPTIONS.filter((a) => a.memory_role === role);
}

/**
 * Return all memory-pattern-relevant assumption keys. CP-9+ persistence
 * uses this to determine which assumption flags to write to snapshot rows.
 */
export function memoryPatternRelevantAssumptionKeys(): ReadonlyArray<AssumptionKey> {
  return assumptionsByMemoryRole("memory_pattern_relevant").map((a) => a.key);
}

/**
 * Validate that a list of assumption keys are all known. Returns the list
 * of unknown keys (empty if all valid).
 */
export function findUnknownAssumptionKeys(keys: ReadonlyArray<string>): ReadonlyArray<string> {
  const known = new Set(ASSUMPTIONS.map((a) => a.key));
  return keys.filter((k) => !known.has(k as AssumptionKey));
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

interface AssumptionTaxonomyValidationResult {
  readonly ok: boolean;
  readonly issues: Array<{ severity: "error" | "warning"; location: string; message: string }>;
  readonly count: number;
  readonly memory_pattern_relevant_count: number;
  readonly deal_specific_count: number;
  readonly version: string;
}

export function validateAssumptionTaxonomy(): AssumptionTaxonomyValidationResult {
  const issues: Array<{ severity: "error" | "warning"; location: string; message: string }> = [];

  // Check for duplicate keys
  const seenKeys = new Set<string>();
  for (const a of ASSUMPTIONS) {
    if (seenKeys.has(a.key)) {
      issues.push({
        severity: "error",
        location: `assumption[${a.key}]`,
        message: `Duplicate assumption key: ${a.key}`,
      });
    }
    seenKeys.add(a.key);
  }

  // Every assumption must have all required fields non-empty
  for (const a of ASSUMPTIONS) {
    if (!a.name || a.name.trim().length === 0) {
      issues.push({
        severity: "error",
        location: `assumption[${a.key}].name`,
        message: "Empty name",
      });
    }
    if (!a.definition || a.definition.trim().length < 20) {
      issues.push({
        severity: "error",
        location: `assumption[${a.key}].definition`,
        message: "Definition too short (<20 chars) — every assumption requires a substantive definition",
      });
    }
    if (!a.failure_consequence || a.failure_consequence.trim().length < 10) {
      issues.push({
        severity: "error",
        location: `assumption[${a.key}].failure_consequence`,
        message: "Failure consequence missing or too short",
      });
    }
    if (!a.typical_strength || a.typical_strength.trim().length < 10) {
      issues.push({
        severity: "error",
        location: `assumption[${a.key}].typical_strength`,
        message: "Typical strength missing or too short",
      });
    }
    if (a.memory_role !== "memory_pattern_relevant" && a.memory_role !== "deal_specific") {
      issues.push({
        severity: "error",
        location: `assumption[${a.key}].memory_role`,
        message: `Invalid memory_role: ${a.memory_role}`,
      });
    }
  }

  // Sanity: at least some assumptions must be memory_pattern_relevant
  // (otherwise CP-9+ memory layer has nothing to learn from)
  const memoryRelevant = ASSUMPTIONS.filter((a) => a.memory_role === "memory_pattern_relevant");
  if (memoryRelevant.length === 0) {
    issues.push({
      severity: "error",
      location: "memory_role_distribution",
      message: "Zero memory_pattern_relevant assumptions — memory layer would have nothing to learn",
    });
  }
  if (memoryRelevant.length < 5) {
    issues.push({
      severity: "warning",
      location: "memory_role_distribution",
      message: `Only ${memoryRelevant.length} memory_pattern_relevant assumptions; expected 10+`,
    });
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const memoryPatternRelevantCount = ASSUMPTIONS.filter((a) => a.memory_role === "memory_pattern_relevant").length;
  const dealSpecificCount = ASSUMPTIONS.filter((a) => a.memory_role === "deal_specific").length;

  return {
    ok: errors === 0,
    issues,
    count: ASSUMPTIONS.length,
    memory_pattern_relevant_count: memoryPatternRelevantCount,
    deal_specific_count: dealSpecificCount,
    version: ASSUMPTION_TAXONOMY_VERSION,
  };
}

function assertAssumptionTaxonomyValid(): void {
  const result = validateAssumptionTaxonomy();
  if (!result.ok) {
    const errorList = result.issues
      .filter((i) => i.severity === "error")
      .map((i) => `  [${i.location}] ${i.message}`)
      .join("\n");
    throw new Error(
      `Assumption taxonomy validation failed (${ASSUMPTION_TAXONOMY_VERSION}):\n${errorList}`,
    );
  }
}

// Fail-closed at load time.
assertAssumptionTaxonomyValid();
