// lib/intelligence/industry-fingerprints.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Underwriting Intelligence Engine — Industry Fingerprint Registry
//
// CP-2 Module: The 12 operating-model fingerprints, 41 industry overrides,
// and fallback fingerprint that the entire engine reads from. This module
// is the Underwriting Constitution expressed as TypeScript.
//
// IMPORTANT: The fingerprint registry is institutional underwriting doctrine.
// Every prior captured here was reviewed against RMA 2025-26 data and the
// constitution document (Section 5 + Section 6). Changes require explicit
// justification in rationale fields. Anonymous edits are not permitted.
//
// This file was originally generated from the constitution data (data.js)
// to ensure constitution ↔ code consistency. Subsequent edits are made
// directly to this file — the constitution document and this module are
// kept in sync through governance, not regeneration.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  IndustryFingerprint,
  IndustryOverride,
  FingerprintResolution,
  OperatingModelKey,
  IndustryKey,
  AssumptionKey,
  MetricKey,
} from "./types";
import { FINGERPRINT_REGISTRY_VERSION } from "./types";
import { ASSUMPTIONS, findUnknownAssumptionKeys } from "./assumption-taxonomy";
import { METRIC_RELEVANCE } from "./metric-relevance";

// ─────────────────────────────────────────────────────────────────────────────
// INDUSTRY → OPERATING MODEL ASSIGNMENT
// ─────────────────────────────────────────────────────────────────────────────
// Every industry is explicitly assigned to an operating model. No runtime
// nearest-neighbor classification (per v2 design decision). Adding a new
// industry requires explicit registry assignment.

export const INDUSTRY_TO_MODEL: Readonly<Record<IndustryKey, OperatingModelKey>> = {
  // professional_services (7)
  cpa: "professional_services",
  marketing: "professional_services",
  engineering: "professional_services",
  staffing: "professional_services",
  insurance: "professional_services",
  realestatebrok: "professional_services",
  propertymanage: "professional_services",
  // healthcare_practice (6)
  dentist: "healthcare_practice",
  physician: "healthcare_practice",
  medspa: "healthcare_practice",
  veterinary: "healthcare_practice",
  physicaltherapy: "healthcare_practice",
  homehealth: "healthcare_practice",
  // field_service (4)
  landscaping: "field_service",
  janitorial: "field_service",
  pestcontrol: "field_service",
  securitysystems: "field_service",
  // consumer_service (4)
  petcare: "consumer_service",
  childcare: "consumer_service",
  hairsalon: "consumer_service",
  laundry: "consumer_service",
  // asset_heavy_service (4)
  selfstorage: "asset_heavy_service",
  carwash: "asset_heavy_service",
  fitness: "asset_heavy_service",
  trucking: "asset_heavy_service",
  // contractor (7)
  hvac: "contractor",
  plumbing: "contractor",
  electrical: "contractor",
  roofing: "contractor",
  painting: "contractor",
  otherspecconstr: "contractor",
  remodeling: "contractor",
  // service_with_inventory (1)
  autorepair: "service_with_inventory",
  // retail_inventory (3)
  grocery: "retail_inventory",
  pharmacy: "retail_inventory",
  gasstation: "retail_inventory",
  // manufacturing (2)
  signmaking: "manufacturing",
  commercialprinting: "manufacturing",
  // ecommerce (1)
  ecommerce: "ecommerce",
  // restaurant (1)
  restaurant: "restaurant",
  // software (1)
  saas: "software",
};

// ─────────────────────────────────────────────────────────────────────────────
// THE TWELVE OPERATING MODEL FINGERPRINTS
// ─────────────────────────────────────────────────────────────────────────────

export const FINGERPRINTS: ReadonlyArray<IndustryFingerprint> = [
  {
    key: "professional_services",
    display_name: "Professional Services",
    industries: [
      "cpa",
      "marketing",
      "engineering",
      "staffing",
      "insurance",
      "realestatebrok",
      "propertymanage",
    ],
    definition: "Human-capital-intensive service businesses with minimal physical inventory, where the revenue-generating asset is the team. SDE margins range widely across the category (8-28%) reflecting differences in revenue mix (recurring vs project), client concentration, and partner-compensation conventions.",
    underwriter_reading: "The underwriter's first question is always 'whose book of business is this?' Customer attribution to individual partners or principals is the single most important diligence item. Margin variance within the category tells less about quality than the assumption stack underneath the margin.",
    primary_metrics: [
      "sde_margin_pct",
      "operating_margin_pct",
      "current_ratio",
      "revenue_cagr_3yr",
    ],
    secondary_metrics: [
      "debt_to_worth",
      "int_coverage",
      "quick_ratio",
    ],
    suppressible_metrics: [
      "inventory_turnover",
      "days_inventory_outstanding",
      "inventory_pct_assets",
      "gross_margin_pct",
    ],
    durability_sensitive_metrics: [
      "sde_margin_pct",
      "revenue_cagr_3yr",
      "current_ratio",
    ],
    lender_sensitive_metrics: [
      "dscr",
      "operating_margin_pct",
      "debt_to_worth",
    ],
    uncertainty_sensitive_metrics: [
      "sde_margin_pct",
      "revenue_cagr_3yr",
    ],
    static_mismatch_triggers: [
      {
        id: "ps-static-001",
        description: "Inventory % of assets > 5% (suggests undisclosed product or hybrid model)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ps-static-002",
        description: "Gross margin populated when service revenue claimed (data entry error or hybrid model)",
        trigger_type: "static",
        basis: "conceptual",
        severity_default: "low",
      },
      {
        id: "ps-static-003",
        description: "EBITDA margin > 40% combined with sole-proprietor structure (likely under-reported owner comp)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ps-static-004",
        description: "DSCR < 1.20x with reported EBITDA margin > 20% (debt structure stress or unverified earnings)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ps-static-005",
        description: "AR days > 90 for industries where pre-payment is typical (CPA, insurance) — collection concern",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
    ],
    trajectory_mismatch_triggers: [
      {
        id: "ps-traj-001",
        description: "SDE margin expansion >300 bps/year sustained over 2+ years (suggests under-reported owner comp or one-time gains being normalized into recurring earnings)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ps-traj-002",
        description: "Revenue CAGR > 30% with flat or declining margin (suggests revenue mix shift toward lower-margin work; partner-departure risk)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ps-traj-003",
        description: "Current ratio declining for 2+ years while revenue grows (working capital absorption signal; accounts receivable expansion)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "ps-traj-004",
        description: "Owner compensation declining while revenue stable (suggests SDE inflation through owner-comp normalization)",
        trigger_type: "trajectory",
        basis: "conceptual",
        severity_default: "medium",
      },
    ],
    structural_uncertainty_signals: [
      {
        id: "ps-struct-001",
        description: "Hybrid service-and-product model (e.g., engineering firm with packaged software components) — fingerprint priors may not capture the product economics",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
      {
        id: "ps-struct-002",
        description: "Multi-partner structure with non-standard equity splits — concentration analysis becomes harder",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "ps-struct-003",
        description: "Recurring revenue claimed without clear contractual basis — revenue mix ambiguous",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
      {
        id: "ps-struct-004",
        description: "Sub-discipline mix not disclosed (marketing agency: PPC vs SEO vs content vs consulting — entirely different unit economics)",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
    ],
    expected_source_standards: [
      {
        metric_or_input: "revenue",
        standard: "tax_returns or bank_statements minimum",
        minimum_source: "tax_returns",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "sde",
        standard: "tax_returns (CPA-prepared); add-back schedule must be source-tagged per line",
        minimum_source: "tax_returns",
        fraud_risk_flag_below_minimum: true,
      },
      {
        metric_or_input: "operating_expenses",
        standard: "internal_pnl acceptable if reconcilable to tax returns",
        minimum_source: "internal_pnl",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "customer_concentration",
        standard: "POS/CRM exports preferred; seller_spreadsheet downgrades evidence_quality by 12 points",
        minimum_source: "pos_exports",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "addback_schedule",
        standard: "Each line item should be tax_return + bank_statement traceable; verbal-only items flagged as fragility",
        minimum_source: "internal_pnl",
        fraud_risk_flag_below_minimum: false,
      },
    ],
    expected_interaction_rule_ids: [
      "earnings_quality_dependency (high SDE margin + add-back concentration)",
      "key_person_concentration (margin profile dependent on single partner/principal)",
      "below_market_with_concerns (low multiple + medium flags often signals partner-departure risk)",
      "revenue_quality_red_flag (project-based revenue masquerading as recurring)",
    ],
    expected_scenario_ids: [
      "industry_normalized — SDE margin pulled to category median, often material because partner comp drives variance",
      "buyer_downside — Revenue -20% (reflects partner-departure scenario); SDE drops disproportionately because partner comp is the primary variable cost",
      "lender_stress — Standard 15/10 compression typically less informative than buyer_downside for this category",
    ],
    benchmark_confidence: [
      { metric: "Margin metrics", confidence: "high", note: "confidence (RMA n=200-1,200+ per industry)" },
      { metric: "DSCR median", confidence: "low", note: "confidence (RMA reports N/A for several services because Net Profit + DDA / CurMatLTD requires term debt many small practices lack)" },
      { metric: "Debt/Worth", confidence: "medium", note: "confidence (skewed by partner draws affecting equity; use directionally only)" },
      { metric: "Current ratio", confidence: "high", note: "confidence (well-populated, meaningful proxy for cash-cycle health)" },
    ],
    expected_failure_modes: [
      "Partner departure with book of business (single-point-of-failure exit)",
      "Customer concentration not disclosed pre-LOI (especially common in CPA and engineering)",
      "Recurring revenue overstated by counting one-time engagements (marketing, engineering)",
      "Personal expenses run through P&L not fully recovered in add-back schedule",
      "Working capital understated (AR seasonality in tax-prep, project-billing in marketing)",
    ],
    fragility_typical_dependencies: [
      "add_back_integrity",
      "key_person_transferability",
      "revenue_quality",
      "customer_retention",
      "recurring_revenue_persistence",
    ],
    is_fallback: false,
    fallback_reason: "",
  },
  {
    key: "healthcare_practice",
    display_name: "Healthcare Practice",
    industries: [
      "dentist",
      "physician",
      "medspa",
      "veterinary",
      "physicaltherapy",
      "homehealth",
    ],
    definition: "Provider-led service businesses where revenue depends on regulated practice rights, payer reimbursement (in most cases), and provider-patient relationships. Med spas and veterinary practice cash-pay, eliminating reimbursement risk but introducing different fragility patterns.",
    underwriter_reading: "Healthcare practices have unique fragility: revenue can compress independently of operations due to payer rate cuts, license issues, or provider departure. The buyer often cannot run the practice themselves (must employ licensed providers). The reimbursement question — what mix, what rates, what direction — is the single most important question for non-cash-pay practices.",
    primary_metrics: [
      "sde_margin_pct",
      "ebitda_margin_pct",
      "operating_margin_pct",
      "current_ratio",
      "ar_days",
    ],
    secondary_metrics: [
      "dscr",
      "int_coverage",
      "debt_to_worth",
      "revenue_cagr_3yr",
    ],
    suppressible_metrics: [
      "inventory_turnover",
      "days_inventory_outstanding",
      "gross_margin_pct",
    ],
    durability_sensitive_metrics: [
      "ebitda_margin_pct",
      "ar_days",
      "current_ratio",
    ],
    lender_sensitive_metrics: [
      "dscr",
      "int_coverage",
      "ar_days",
    ],
    uncertainty_sensitive_metrics: [
      "ebitda_margin_pct",
      "revenue_cagr_3yr",
      "ar_days",
    ],
    static_mismatch_triggers: [
      {
        id: "hc-static-001",
        description: "Inventory % of assets > 8% for non-vet practice (anomalous — Veterinary's 6.4% is the in-category exception)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "medium",
      },
      {
        id: "hc-static-002",
        description: "AR days < 20 for insurance-billing practice (suggests cash-pay or aggressive recognition)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "hc-static-003",
        description: "AR days > 75 for cash-pay practice like Med Spa (collection concern)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "medium",
      },
      {
        id: "hc-static-004",
        description: "EBITDA margin > 30% for non-cosmetic practice (suggests under-reported provider comp or payer-mix concentration)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "hc-static-005",
        description: "Operating margin < 5% with strong revenue growth (suggests deferred capex on equipment, common in physician offices)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "hc-static-006",
        description: "DSCR > 5x with high inventory pct (asset structure misclassified)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
    ],
    trajectory_mismatch_triggers: [
      {
        id: "hc-traj-001",
        description: "EBITDA margin expansion >250 bps/year (suggests payer-mix shift, fee schedule renegotiation, or under-reported provider comp normalizing — diligence required to identify which)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "hc-traj-002",
        description: "Revenue growth flat or declining with margin stable (suggests volume compression; payer rate cuts or competitive entry)",
        trigger_type: "trajectory",
        basis: "conceptual",
        severity_default: "medium",
      },
      {
        id: "hc-traj-003",
        description: "AR days extending over consecutive periods (reimbursement cycle deterioration; payer change)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "hc-traj-004",
        description: "Owner-provider salary declining while practice revenue stable (SDE inflation via provider-comp normalization)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
    ],
    structural_uncertainty_signals: [
      {
        id: "hc-struct-001",
        description: "Mixed cash-pay and insurance-pay practice without payer-mix disclosure",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
      {
        id: "hc-struct-002",
        description: "Multi-location practice with location-level economics not disclosed (regional payer mix varies)",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
      {
        id: "hc-struct-003",
        description: "Concierge or membership model layered on traditional fee-for-service",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "hc-struct-004",
        description: "Telehealth revenue mix unclear (different reimbursement and capacity dynamics)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
    ],
    expected_source_standards: [
      {
        metric_or_input: "revenue",
        standard: "tax_returns + practice management software exports (PMS); reimbursement data should come from PMS not seller_spreadsheet",
        minimum_source: "tax_returns",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "payer_mix",
        standard: "PMS export required; seller_spreadsheet representation triggers high uncertainty",
        minimum_source: "seller_spreadsheet",
        fraud_risk_flag_below_minimum: true,
      },
      {
        metric_or_input: "provider_compensation",
        standard: "payroll_filings (W-2) + tax_returns (K-1 for partners)",
        minimum_source: "tax_returns",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "ar_aging",
        standard: "PMS export preferred; internal_pnl acceptable if dates traceable",
        minimum_source: "internal_pnl",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "patient_panel_size",
        standard: "PMS export; verbal_assertion triggers explicit uncertainty flag",
        minimum_source: "internal_pnl",
        fraud_risk_flag_below_minimum: false,
      },
    ],
    expected_interaction_rule_ids: [
      "reimbursement_dependency (margin sensitive to payer mix not stress-tested)",
      "key_person_concentration (single-provider practice without succession)",
      "ar_quality_concern (AR aging beyond typical reimbursement cycle)",
      "compliance_risk_signal (regulatory or licensing risk implied by structure)",
    ],
    expected_scenario_ids: [
      "industry_normalized — Reimbursement-rate-equivalent margin pull is the dominant scenario; less relevant for cash-pay subcategories",
      "lender_stress — Pair with AR-days extension scenario (working capital stress)",
      "buyer_downside — Provider-departure scenario more informative than blanket revenue compression",
    ],
    benchmark_confidence: [
      { metric: "EBITDA margin", confidence: "high", note: "confidence for general medical/dental; LOWER for med spa (n=2,005 is shared with physician office; med-spa-specific data not separately tracked)" },
      { metric: "DSCR", confidence: "medium", note: "Dentist and Physician show N/A in RMA (small operators rarely carry CurMatLTD); higher confidence for Vet and PT/Chiro" },
      { metric: "Debt/Worth", confidence: "low", note: "for Dentist (Neg NW common — practice loans against future cash flow)" },
      { metric: "general", confidence: "medium", note: "AR days: implied through current ratio and quick ratio gap (high confidence proxy)" },
    ],
    expected_failure_modes: [
      "Provider non-compete inadequate; provider takes patient panel post-close",
      "Reimbursement rate cut announced mid-diligence or post-close",
      "Equipment lifecycle / deferred capex not disclosed",
      "Payer concentration (single insurance contract > 30% of revenue)",
      "Hygienist or technician dependency in dental/vet (operational labor at risk)",
      "Compliance issues surfaced during diligence (billing audit, licensing)",
    ],
    fragility_typical_dependencies: [
      "key_person_transferability",
      "reimbursement_stability",
      "labor_retention",
      "customer_retention",
      "capex_stability",
    ],
    is_fallback: false,
    fallback_reason: "",
  },
  {
    key: "field_service",
    display_name: "Field Service",
    industries: [
      "landscaping",
      "janitorial",
      "pestcontrol",
      "securitysystems",
    ],
    definition: "Route-based recurring service businesses where labor visits customer locations on a contracted or routine cadence. Customer concentration risk and route density define both unit economics and durability. Working capital pressure tends to be moderate but real (AR days expand during seasonal peaks).",
    underwriter_reading: "Two questions dominate: 'how concentrated is the customer base, and how transferable are the routes?' Field service businesses scale by route density — losing a small number of large customers can compress unit economics far more than the revenue loss suggests because route efficiency degrades. The recurring nature of revenue can mask single-customer dependencies.",
    primary_metrics: [
      "sde_margin_pct",
      "ebitda_margin_pct",
      "current_ratio",
      "revenue_cagr_3yr",
    ],
    secondary_metrics: [
      "dscr",
      "int_coverage",
      "debt_to_worth",
      "operating_margin_pct",
    ],
    suppressible_metrics: [
      "gross_margin_pct",
      "inventory_turnover",
      "days_inventory_outstanding",
    ],
    durability_sensitive_metrics: [
      "sde_margin_pct",
      "revenue_cagr_3yr",
      "ar_days",
    ],
    lender_sensitive_metrics: [
      "dscr",
      "int_coverage",
      "current_ratio",
    ],
    uncertainty_sensitive_metrics: [
      "sde_margin_pct",
      "revenue_cagr_3yr",
    ],
    static_mismatch_triggers: [
      {
        id: "fs-static-001",
        description: "Inventory % of assets > 7% (atypical except Security Systems at 9.6% — flagged in-category as expected anomaly)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "fs-static-002",
        description: "EBITDA margin > 25% (statistically unusual — top of category is Pest Control / Security at 16-17%)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "high",
      },
      {
        id: "fs-static-003",
        description: "Operating margin < 5% with strong DSCR (suggests structural cost issue or aggressive add-backs)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "fs-static-004",
        description: "Gross margin populated (data entry error — these are predominantly no-COGS services)",
        trigger_type: "static",
        basis: "conceptual",
        severity_default: "low",
      },
      {
        id: "fs-static-005",
        description: "AR days > 60 (collection concern; route density typically supports < 45)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
    ],
    trajectory_mismatch_triggers: [
      {
        id: "fs-traj-001",
        description: "Revenue CAGR > 25% with EBITDA margin flat or compressing (route density degradation as growth absorbs operational efficiency)",
        trigger_type: "trajectory",
        basis: "statistical",
        severity_default: "medium",
      },
      {
        id: "fs-traj-002",
        description: "Customer count declining while revenue rises (concentration intensifying; top-customer dependency growing)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "fs-traj-003",
        description: "AR days extending 2+ consecutive years (collection deterioration or customer credit risk)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "fs-traj-004",
        description: "Labor cost as % of revenue rising 200+ bps/year (wage inflation unmatched by pricing — pricing power eroding)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
    ],
    structural_uncertainty_signals: [
      {
        id: "fs-struct-001",
        description: "Recurring-contract revenue vs project revenue not separately disclosed",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "fs-struct-002",
        description: "Commercial vs residential mix not disclosed (Janitorial, Pest Control particularly)",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
      {
        id: "fs-struct-003",
        description: "Route geography density not disclosed (single-metro vs multi-metro materially different)",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
      {
        id: "fs-struct-004",
        description: "Subcontractor reliance not disclosed (asset-light variant vs employee-crew variant)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
    ],
    expected_source_standards: [
      {
        metric_or_input: "revenue",
        standard: "tax_returns + bank_statements; route-level revenue from internal_pnl acceptable",
        minimum_source: "tax_returns",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "customer_concentration",
        standard: "CRM/dispatch software export preferred; seller_spreadsheet acceptable with explicit top-10 names",
        minimum_source: "seller_spreadsheet",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "contract_status",
        standard: "actual contract documents required for recurring-revenue claims",
        minimum_source: "pos_exports",
        fraud_risk_flag_below_minimum: true,
      },
      {
        metric_or_input: "labor_cost",
        standard: "payroll_filings (941) — non-negotiable",
        minimum_source: "payroll_filings",
        fraud_risk_flag_below_minimum: true,
      },
      {
        metric_or_input: "route_data",
        standard: "dispatch software export; verbal_assertion triggers route-density uncertainty flag",
        minimum_source: "internal_pnl",
        fraud_risk_flag_below_minimum: false,
      },
    ],
    expected_interaction_rule_ids: [
      "customer_concentration_signal (top-5 revenue analysis required)",
      "route_density_risk (geographic concentration affecting unit economics)",
      "seasonal_revenue_concentration (Landscaping particularly; check Q3 weight)",
      "labor_intensity_with_thin_margin (margin compression risk if wage inflation continues)",
    ],
    expected_scenario_ids: [
      "industry_normalized — Most informative when SDE margin is at or above category median",
      "lender_stress — Standard 15/10 compression; expect DSCR resilience because revenue is contracted",
      "buyer_downside — Top-customer-loss scenario (e.g., -25% revenue from largest 2 accounts) more informative than blanket compression",
    ],
    benchmark_confidence: [
      { metric: "EBITDA margin", confidence: "high", note: "confidence (n=79 for Pest Control is the floor; others 200+)" },
      { metric: "DSCR", confidence: "medium", note: "HIGH — Pest Control shows N/A (n likely <10 for CurMatLTD); others well-populated" },
      { metric: "Current/quick ratio", confidence: "high", note: "confidence" },
      { metric: "Revenue CAGR", confidence: "high", note: "confidence — meaningful in this category because organic growth differs from acquisition-fed growth" },
    ],
    expected_failure_modes: [
      "Top-5 customer loss post-close (especially in Janitorial commercial accounts)",
      "Labor cost inflation outpacing pricing power (Landscaping crews, Janitorial wages)",
      "Seasonal revenue overstated by trailing twelve months ending in peak (Landscaping)",
      "Insurance / bonding requirements lapse during transition (Security Systems, Pest Control)",
      "Route density degradation as routes are rebalanced post-close",
    ],
    fragility_typical_dependencies: [
      "customer_retention",
      "labor_retention",
      "pricing_power",
      "recurring_revenue_persistence",
      "transition_execution",
    ],
    is_fallback: false,
    fallback_reason: "",
  },
  {
    key: "consumer_service",
    display_name: "Consumer Service",
    industries: [
      "petcare",
      "childcare",
      "hairsalon",
      "laundry",
    ],
    definition: "Location-dependent service businesses serving recurring local consumers. Revenue is fragmented across many small transactions rather than concentrated in contracts. Real estate, location quality, and local competition drive both margin and durability. Labor turnover at the technician level is often the operational risk.",
    underwriter_reading: "Consumer service businesses appear simpler than they are. The underwriter looks first at lease terms — most failures trace to either a lease event (renewal, rent step, landlord change) or local demographic shift. The next question is wage cost trajectory: at 15-22% EBITDA margins, a 200-bps wage shock erodes coverage materially.",
    primary_metrics: [
      "sde_margin_pct",
      "ebitda_margin_pct",
      "current_ratio",
      "revenue_cagr_3yr",
    ],
    secondary_metrics: [
      "dscr",
      "operating_margin_pct",
      "int_coverage",
      "debt_to_worth",
    ],
    suppressible_metrics: [
      "gross_margin_pct",
      "inventory_turnover",
      "days_inventory_outstanding",
    ],
    durability_sensitive_metrics: [
      "sde_margin_pct",
      "ebitda_margin_pct",
      "revenue_cagr_3yr",
    ],
    lender_sensitive_metrics: [
      "dscr",
      "int_coverage",
      "current_ratio",
    ],
    uncertainty_sensitive_metrics: [
      "sde_margin_pct",
      "revenue_cagr_3yr",
    ],
    static_mismatch_triggers: [
      {
        id: "cs-static-001",
        description: "Inventory % of assets > 12% for non-retail consumer service (Beauty Salons 9.3% in-category expected; > 12% suggests retail component)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "cs-static-002",
        description: "EBITDA margin > 30% (statistically unusual — top of category is Child Care at 21.8%)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "high",
      },
      {
        id: "cs-static-003",
        description: "Revenue CAGR > 30% (suggests aggressive expansion or acquisition-driven growth requiring decomposition)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "cs-static-004",
        description: "Current ratio < 0.8 (working capital stress; under-capitalized at close)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "medium",
      },
      {
        id: "cs-static-005",
        description: "Sales/assets ratio > 5 (suggests asset-light, possibly leased-equipment model requiring different read)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
    ],
    trajectory_mismatch_triggers: [
      {
        id: "cs-traj-001",
        description: "Revenue declining while EBITDA margin rising (cost cuts or wage suppression — typically unsustainable)",
        trigger_type: "trajectory",
        basis: "conceptual",
        severity_default: "low",
      },
      {
        id: "cs-traj-002",
        description: "Same-store revenue trajectory negative with reported growth from new locations (mixing same-store and aggregate masks decline)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "cs-traj-003",
        description: "Lease cost as % of revenue rising while revenue flat (lease step or non-renewal pressure imminent)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "high",
      },
      {
        id: "cs-traj-004",
        description: "Labor cost as % of revenue stable in tight labor markets (suggests under-reported wage cost or owner-operator labor not in P&L)",
        trigger_type: "trajectory",
        basis: "conceptual",
        severity_default: "medium",
      },
    ],
    structural_uncertainty_signals: [
      {
        id: "cs-struct-001",
        description: "Owner-operator labor not separately quantified (Beauty Salons, Laundry — owner working full-time but not on payroll)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "cs-struct-002",
        description: "Tip income treatment unclear (Beauty Salons — booth rental vs employee with tips materially different)",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
      {
        id: "cs-struct-003",
        description: "Booth-rental vs employee model mixed at single location",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
      {
        id: "cs-struct-004",
        description: "Multi-location with location-level economics not disclosed",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
    ],
    expected_source_standards: [
      {
        metric_or_input: "revenue",
        standard: "POS exports (Square, Mindbody, Booker) preferred; tax_returns minimum",
        minimum_source: "tax_returns",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "labor_cost",
        standard: "payroll_filings required; 1099 contractor schedule (Beauty Salons booth rental)",
        minimum_source: "payroll_filings",
        fraud_risk_flag_below_minimum: true,
      },
      {
        metric_or_input: "lease_terms",
        standard: "actual lease documents required for lease-renewal analysis",
        minimum_source: "internal_pnl",
        fraud_risk_flag_below_minimum: true,
      },
      {
        metric_or_input: "same_store_revenue",
        standard: "POS export preferred; aggregate vs same-store distinction must be sourced not asserted",
        minimum_source: "pos_exports",
        fraud_risk_flag_below_minimum: true,
      },
      {
        metric_or_input: "capacity_utilization",
        standard: "POS or scheduling-software export (Child Care occupancy, Fitness membership counts)",
        minimum_source: "pos_exports",
        fraud_risk_flag_below_minimum: false,
      },
    ],
    expected_interaction_rule_ids: [
      "lease_renewal_exposure (lease term remaining + renewal-rate risk)",
      "labor_dependency_wage_risk (wage inflation vs pricing power)",
      "local_demographic_dependency (single-location consumer service)",
      "owner_dependency_signal (especially Beauty Salons; check operator-customer relationships)",
    ],
    expected_scenario_ids: [
      "industry_normalized — Useful but limited; consumer service margin variance often reflects real positioning differences",
      "lender_stress — Most informative for the category (revenue and margin both compress under recession)",
      "buyer_downside — Wage-inflation scenario (+200 bps to labor costs); informative because operator can't pass through quickly",
    ],
    benchmark_confidence: [
      { metric: "EBITDA margin", confidence: "high", note: "confidence (n=54-474 across category; Laundry n=54 is the floor — interpret with caution)" },
      { metric: "DSCR", confidence: "medium", note: "Beauty Salons N/A, others populated" },
      { metric: "Current ratio", confidence: "high", note: "confidence" },
      { metric: "Inventory metrics", confidence: "low", note: "relevance for the category — suppress display unless clear retail component" },
    ],
    expected_failure_modes: [
      "Lease event (non-renewal, large rent increase) within 24 months of close",
      "Wage cost inflation (technician-level labor) outpacing pricing",
      "Operator-customer relationships dependent on seller (Beauty Salons especially)",
      "Local competition opens nearby; market share erodes",
      "Demographic shift in immediate trade area",
      "Permit / licensing requirements (Child Care state-specific) change",
    ],
    fragility_typical_dependencies: [
      "labor_retention",
      "pricing_power",
      "customer_retention",
      "transition_execution",
      "key_person_transferability",
    ],
    is_fallback: false,
    fallback_reason: "",
  },
  {
    key: "asset_heavy_service",
    display_name: "Asset-Heavy Service",
    industries: [
      "selfstorage",
      "carwash",
      "fitness",
      "trucking",
    ],
    definition: "Service businesses where the physical asset — real estate, equipment, fleet — is itself a primary driver of value. EBITDA margins look inflated relative to other service businesses because D&A is a substantial true cost that EBITDA excludes. Capex stability and asset condition are decisive.",
    underwriter_reading: "EBITDA is a misleading metric here. A self-storage business showing 52.8% EBITDA margin has 25-30 percentage points of that being D&A that is real economic depreciation. The underwriter reads operating margin and free cash flow more than EBITDA. Capex deferral pre-sale is the most common manipulation — assets look fine on the balance sheet but require significant near-term capex.",
    primary_metrics: [
      "operating_margin_pct",
      "sde_margin_pct",
      "ebitda_margin_pct",
      "current_ratio",
      "sales_to_assets",
    ],
    secondary_metrics: [
      "dscr",
      "int_coverage",
      "debt_to_worth",
      "revenue_cagr_3yr",
    ],
    suppressible_metrics: [
      "gross_margin_pct",
      "inventory_turnover",
      "days_inventory_outstanding",
    ],
    durability_sensitive_metrics: [
      "operating_margin_pct",
      "sales_to_assets",
      "capex_intensity_implied",
    ],
    lender_sensitive_metrics: [
      "dscr",
      "ltv",
      "int_coverage",
    ],
    uncertainty_sensitive_metrics: [
      "operating_margin_pct",
      "revenue_cagr_3yr",
    ],
    static_mismatch_triggers: [
      {
        id: "ah-static-001",
        description: "EBITDA-to-operating-margin gap < 8 percentage points (suggests under-stated D&A or asset-light variant)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ah-static-002",
        description: "EBITDA-to-operating-margin gap > 30 points outside Self-Storage (atypical — only Self-Storage hits this in-category)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ah-static-003",
        description: "Sales/assets ratio > 4 for capex-intensive subcategory (Trucking, Fitness — suggests asset gaps or leased model)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ah-static-004",
        description: "Operating margin > 25% for non-Self-Storage (suggests under-reported maintenance capex)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ah-static-005",
        description: "DSCR > 4x with high LTV (asset value supporting structure that operations alone may not)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
    ],
    trajectory_mismatch_triggers: [
      {
        id: "ah-traj-001",
        description: "EBITDA margin stable or rising while D&A as % of revenue falling (capex deferral; assets aging without replacement)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "ah-traj-002",
        description: "Operating margin rising while sales/assets ratio declining (asset productivity declining — capex deferred but not yet showing in maintenance costs)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "ah-traj-003",
        description: "Maintenance capex as % of revenue declining for 2+ years (deferred capex backlog accumulating)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "ah-traj-004",
        description: "Asset utilization (storage occupancy, car wash throughput, fitness membership) declining while revenue stable (price increases masking volume decline)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
    ],
    structural_uncertainty_signals: [
      {
        id: "ah-struct-001",
        description: "Real estate ownership vs lease structure unclear (Self-Storage particularly — real-estate-owned vs operator-only deals are structurally different)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "ah-struct-002",
        description: "Sub-model unclear (Car Wash: tunnel vs bay vs exterior-only; Fitness: 24-hour vs full-service vs studio)",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
      {
        id: "ah-struct-003",
        description: "Capex categorization mixed between maintenance and growth",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
      {
        id: "ah-struct-004",
        description: "Asset age distribution not disclosed (fleet, equipment, facilities)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
    ],
    expected_source_standards: [
      {
        metric_or_input: "revenue",
        standard: "tax_returns + bank_statements + management-system export (storage software, fitness CRM)",
        minimum_source: "tax_returns",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "capex_history",
        standard: "tax_returns Form 4562 (depreciation schedule); fixed-asset register preferred",
        minimum_source: "tax_returns",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "asset_condition",
        standard: "third-party inspection or independent appraisal preferred; seller representation triggers uncertainty",
        minimum_source: "internal_pnl",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "occupancy_or_utilization",
        standard: "management-system export required; seller_spreadsheet acceptable only with caveats",
        minimum_source: "pos_exports",
        fraud_risk_flag_below_minimum: true,
      },
      {
        metric_or_input: "lease_structure",
        standard: "actual lease/title documents — non-negotiable",
        minimum_source: "internal_pnl",
        fraud_risk_flag_below_minimum: true,
      },
    ],
    expected_interaction_rule_ids: [
      "ebitda_overstates_cash_flow (D&A magnitude relative to operating margin)",
      "deferred_capex_signal (operating margin too high vs asset age implied)",
      "asset_concentration_risk (single-property real estate exposure)",
      "leverage_collateral_tension (high LTV against single asset)",
    ],
    expected_scenario_ids: [
      "industry_normalized — Useful for SDE; less useful for EBITDA (asset-heavy adjustments matter more)",
      "capex_normalized — Replaces standard normalized case for this category: pull EBITDA down by typical maintenance capex %",
      "buyer_downside — Single-asset disruption scenario (storage facility maintenance event, trucking fleet replacement cycle)",
    ],
    benchmark_confidence: [
      { metric: "EBITDA margin", confidence: "high", note: "confidence but should be read alongside operating margin not in isolation" },
      { metric: "Operating margin", confidence: "high", note: "confidence — the more honest signal for this category" },
      { metric: "DSCR", confidence: "medium", note: "Self-Storage N/A; others populated" },
      { metric: "Sales/assets", confidence: "high", note: "confidence and important — direct proxy for asset utilization" },
    ],
    expected_failure_modes: [
      "Deferred capex catching up post-close (especially Car Wash, Fitness equipment)",
      "Single-asset event (storage facility damage, fleet failure, fitness club lease event)",
      "Real estate revaluation if collateral lender requires reappraisal",
      "Membership churn beyond modeled (Fitness specifically)",
      "Asset utilization decline (storage occupancy drop, car wash throughput decline)",
      "Loan-against-asset structure failing if asset value impaired",
    ],
    fragility_typical_dependencies: [
      "capex_stability",
      "covenant_headroom",
      "customer_retention",
      "pricing_power",
      "transition_execution",
    ],
    is_fallback: false,
    fallback_reason: "",
  },
  {
    key: "contractor",
    display_name: "Contractor",
    industries: [
      "hvac",
      "plumbing",
      "electrical",
      "roofing",
      "painting",
      "otherspecconstr",
      "remodeling",
    ],
    definition: "Project-based service businesses with material pass-through (gross margin reported). EBITDA margins cluster tightly at 9-13% — narrow band reflects the structural economics. Working capital intensity is high (project deposits, retainage, AR cycles). Labor availability is increasingly the binding constraint.",
    underwriter_reading: "Contractors look simple but underwrite hard. The 9-13% EBITDA band is the entire workable range — outliers in either direction need explanation. Top concerns are: project pipeline visibility (is the trailing revenue replicable?), labor crew stability (technicians can leave for competitors quickly), working capital adequacy (one large delayed receivable can crater coverage). Service-vs-install mix is often the most important question and rarely visible in headline metrics.",
    primary_metrics: [
      "gross_margin_pct",
      "sde_margin_pct",
      "ebitda_margin_pct",
      "current_ratio",
      "ar_days",
    ],
    secondary_metrics: [
      "dscr",
      "operating_margin_pct",
      "int_coverage",
      "debt_to_worth",
      "revenue_cagr_3yr",
    ],
    suppressible_metrics: [
      "inventory_turnover",
      "days_inventory_outstanding",
    ],
    durability_sensitive_metrics: [
      "gross_margin_pct",
      "ebitda_margin_pct",
      "current_ratio",
      "ar_days",
      "revenue_cagr_3yr",
    ],
    lender_sensitive_metrics: [
      "dscr",
      "int_coverage",
      "current_ratio",
      "ar_days",
    ],
    uncertainty_sensitive_metrics: [
      "ebitda_margin_pct",
      "gross_margin_pct",
      "revenue_cagr_3yr",
    ],
    static_mismatch_triggers: [
      {
        id: "ct-static-001",
        description: "EBITDA margin > 18% (statistically unusual — category top is Other Spec Constr at 12.7%; suggests add-back inflation or service-mix outlier)",
        trigger_type: "static",
        basis: "both",
        severity_default: "high",
      },
      {
        id: "ct-static-002",
        description: "EBITDA margin < 5% (suggests labor cost spiral or project losses)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ct-static-003",
        description: "Gross margin < 25% (suggests material cost issues or aggressive bidding)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ct-static-004",
        description: "Gross margin > 50% (suggests service-heavy mix, atypical for contractor; verify revenue composition)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ct-static-005",
        description: "AR days < 30 (suggests cash-collection bias, often service-only contractor — different model)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ct-static-006",
        description: "AR days > 90 (project payment dispute risk or backlog of disputed billings)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "medium",
      },
      {
        id: "ct-static-007",
        description: "Current ratio > 4 (statistically high — suggests asset-light or balance-sheet cash that isn't operating cash)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ct-static-008",
        description: "Inventory % of assets > 10% outside Home Renovation (Home Renovation 8.1% in-category expected; > 10% elsewhere atypical)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
    ],
    trajectory_mismatch_triggers: [
      {
        id: "ct-traj-001",
        description: "EBITDA margin expanding 200+ bps/year (statistically unusual within the 9-13% category band — likely add-back inflation, service-mix shift, or temporary pricing power)",
        trigger_type: "trajectory",
        basis: "statistical",
        severity_default: "high",
      },
      {
        id: "ct-traj-002",
        description: "Gross margin rising while revenue rising (typically inverse — material cost pass-through compresses GM at scale)",
        trigger_type: "trajectory",
        basis: "conceptual",
        severity_default: "low",
      },
      {
        id: "ct-traj-003",
        description: "AR days extending 2+ consecutive years (disputed billings accumulating, project payment slowdown)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "ct-traj-004",
        description: "Service revenue % rising sharply year-over-year (mix shift toward higher-margin work — verify the shift is real and durable, not one-time large contracts)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "ct-traj-005",
        description: "Backlog declining while reported revenue flat (project pipeline thinning; trailing revenue not replicable)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
    ],
    structural_uncertainty_signals: [
      {
        id: "ct-struct-001",
        description: "Service-vs-install mix not disclosed (same-revenue HVAC businesses can have 8% or 16% EBITDA based on mix)",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
      {
        id: "ct-struct-002",
        description: "Job-cost system not used (revenue and cost matched at project completion vs cash basis vs accrual — three different P&L pictures)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "ct-struct-003",
        description: "Subcontractor reliance unclear (asset-light variant uses subs heavily, structurally different from employee-crew)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "ct-struct-004",
        description: "Percentage-of-completion vs completed-contract accounting (revenue timing materially different)",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
      {
        id: "ct-struct-005",
        description: "Specialty mix unclear (Other Spec Constr — concrete vs masonry vs glass have different economics)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
    ],
    expected_source_standards: [
      {
        metric_or_input: "revenue",
        standard: "tax_returns + job-cost software export (Buildertrend, JobTread); internal_pnl alone insufficient",
        minimum_source: "tax_returns",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "cogs_classification",
        standard: "job-cost system export; material vs labor breakdown required",
        minimum_source: "pos_exports",
        fraud_risk_flag_below_minimum: true,
      },
      {
        metric_or_input: "backlog",
        standard: "job-cost system or signed contracts; seller_spreadsheet acceptable with project-level detail",
        minimum_source: "seller_spreadsheet",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "service_mix",
        standard: "job-cost export categorizing service vs install revenue; verbal_assertion triggers high uncertainty",
        minimum_source: "internal_pnl",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "addback_schedule",
        standard: "owner vehicles, insurance, equipment — each line must have tax_return basis and bank_statement support",
        minimum_source: "internal_pnl",
        fraud_risk_flag_below_minimum: true,
      },
    ],
    expected_interaction_rule_ids: [
      "earnings_quality_dependency (add-back concentration in owner trucks/equipment)",
      "labor_dependency_with_thin_margin (wage inflation absorbing margin)",
      "project_pipeline_invisibility (trailing revenue without backlog disclosure)",
      "service_vs_install_mix_unknown (margin profile depends on mix not disclosed)",
      "working_capital_seasonality (high AR days + low current ratio)",
    ],
    expected_scenario_ids: [
      "industry_normalized — Critical for this category given the tight EBITDA band; outliers should compress materially",
      "lender_stress — Standard 15/10 compression; expect DSCR to compress meaningfully because EBITDA is already thin",
      "buyer_downside — Labor cost shock scenario (+300 bps to wages); informative because wage inflation has been persistent",
    ],
    benchmark_confidence: [
      { metric: "Gross margin", confidence: "high", note: "confidence — RMA tracks gross margin for contractors (key distinguishing feature)" },
      { metric: "EBITDA margin", confidence: "high", note: "confidence (n=112-819 across category)" },
      { metric: "DSCR", confidence: "high", note: "confidence (most contractors carry CurMatLTD; well-populated)" },
      { metric: "AR days", confidence: "high", note: "confidence via current/quick ratio derivation" },
      { metric: "Revenue CAGR", confidence: "high", note: "confidence and meaningful" },
    ],
    expected_failure_modes: [
      "Backlog disclosure absent or weak (most common single failure mode)",
      "Labor crew departure post-close to competitor",
      "Service-vs-install mix shift toward lower-margin install work",
      "Disputed billings hidden in AR (look at AR over 90 days)",
      "Add-back schedule reveals owner trucks/insurance not actually personal",
      "Bonding capacity issue triggered by ownership change",
      "Project pipeline volatility (single GC dependency)",
      "Material cost lock-in expiring",
    ],
    fragility_typical_dependencies: [
      "add_back_integrity",
      "labor_retention",
      "working_capital_stability",
      "customer_retention",
      "pricing_power",
      "key_person_transferability",
    ],
    is_fallback: false,
    fallback_reason: "",
  },
  {
    key: "service_with_inventory",
    display_name: "Service with Inventory",
    industries: [
      "autorepair",
    ],
    definition: "Service business model where parts inventory is a real, working component of operations. RMA reports no COGS (service classification) but inventory sits at 11.3% of assets — meaningful working capital tied up in parts. Unique single-industry bucket because the financial structure differs from both pure service and retail.",
    underwriter_reading: "The auto-repair underwriter's read is unique: revenue mix between mechanical labor, parts markup, and tire/accessory sales drives margin profile entirely. Two shops with identical revenue can have 8% vs 18% EBITDA margins based on service mix. Parts inventory is real capital — must be valued, tested for obsolescence, and considered in working capital walk.",
    primary_metrics: [
      "sde_margin_pct",
      "ebitda_margin_pct",
      "current_ratio",
      "inventory_pct_assets",
    ],
    secondary_metrics: [
      "dscr",
      "int_coverage",
      "operating_margin_pct",
      "debt_to_worth",
    ],
    suppressible_metrics: [
      "gross_margin_pct",
    ],
    durability_sensitive_metrics: [
      "sde_margin_pct",
      "inventory_pct_assets",
      "ar_days",
    ],
    lender_sensitive_metrics: [
      "dscr",
      "int_coverage",
      "current_ratio",
    ],
    uncertainty_sensitive_metrics: [
      "sde_margin_pct",
      "inventory_pct_assets",
    ],
    static_mismatch_triggers: [
      {
        id: "swi-static-001",
        description: "Inventory % of assets < 5% (likely service-only shop, different operating profile)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "medium",
      },
      {
        id: "swi-static-002",
        description: "Inventory % of assets > 20% (likely tire/accessory retail component, different read)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "medium",
      },
      {
        id: "swi-static-003",
        description: "EBITDA margin > 22% (top of category; suggests service-mix outlier or add-back concentration)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "swi-static-004",
        description: "AR days > 45 (most auto repair is point-of-sale; suggests fleet/commercial mix that needs disclosure)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "swi-static-005",
        description: "Operating margin > 18% (atypical — implies under-reported labor or aggressive add-backs)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
    ],
    trajectory_mismatch_triggers: [
      {
        id: "swi-traj-001",
        description: "Inventory growing faster than revenue (parts obsolescence accumulating)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "swi-traj-002",
        description: "Service mix shift toward parts/tires (margin profile changes — lower service hours, higher parts revenue)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "swi-traj-003",
        description: "Master technician departures correlating with revenue compression (capacity-driven business)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "swi-traj-004",
        description: "Commercial/fleet revenue % rising rapidly (AR days extension follows; working capital implications)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
    ],
    structural_uncertainty_signals: [
      {
        id: "swi-struct-001",
        description: "Labor-vs-parts-vs-tires mix not disclosed",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
      {
        id: "swi-struct-002",
        description: "Fleet/commercial vs retail consumer mix unclear",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "swi-struct-003",
        description: "Warranty work treatment (manufacturer reimbursement timing affects AR)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "swi-struct-004",
        description: "Diagnostic vs repair mix (diagnostic is the entry point but repair is the margin)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
    ],
    expected_source_standards: [
      {
        metric_or_input: "revenue",
        standard: "tax_returns + shop management software export (Mitchell, Tekmetric)",
        minimum_source: "tax_returns",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "service_mix",
        standard: "shop software export categorizing labor/parts/tires/warranty",
        minimum_source: "internal_pnl",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "inventory",
        standard: "shop software inventory module export; physical count preferred",
        minimum_source: "internal_pnl",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "technician_data",
        standard: "payroll_filings + shop software (productivity data); turnover history required",
        minimum_source: "payroll_filings",
        fraud_risk_flag_below_minimum: true,
      },
    ],
    expected_interaction_rule_ids: [
      "service_mix_concentration (labor vs parts vs tires mix)",
      "inventory_obsolescence_risk (parts that may not turn)",
      "fleet_dependency (commercial accounts requiring AR days extension)",
      "technician_retention (master techs are the binding capacity)",
    ],
    expected_scenario_ids: [
      "industry_normalized — Useful but bounded; service-mix dominates variance",
      "lender_stress — Standard compression",
      "inventory_writedown — Parts obsolescence scenario (15% inventory writedown); informative because parts can age",
    ],
    benchmark_confidence: [
      { metric: "EBITDA margin", confidence: "high", note: "confidence (n=350)" },
      { metric: "DSCR", confidence: "high", note: "confidence (4.4x median; well-populated)" },
      { metric: "Current ratio", confidence: "high", note: "confidence" },
      { metric: "Inventory pct", confidence: "high", note: "confidence and meaningful (the defining metric for this model)" },
    ],
    expected_failure_modes: [
      "Master technician departure (capacity loss)",
      "Service-mix shift toward lower-margin work",
      "Parts inventory obsolescence (older vehicle parts)",
      "Fleet customer loss (commercial accounts)",
      "EPA / OSHA compliance event",
      "Lease event on real estate (auto-repair locations are sticky)",
    ],
    fragility_typical_dependencies: [
      "labor_retention",
      "inventory_behavior_stability",
      "customer_retention",
      "pricing_power",
      "key_person_transferability",
    ],
    is_fallback: false,
    fallback_reason: "",
  },
  {
    key: "retail_inventory",
    display_name: "Retail Inventory",
    industries: [
      "grocery",
      "pharmacy",
      "gasstation",
    ],
    definition: "Inventory-heavy retail with thin margins where working capital management IS the business. EBITDA margins are 4-7%, gross margins 20-30%. Cash conversion cycle, shrink, and category management drive both unit economics and durability. Note: Pharmacy and Gas Station data is from 2021-22 (RMA-flagged), introducing temporal uncertainty.",
    underwriter_reading: "Retail inventory businesses operate on volume × turnover × shrink. The underwriter looks first at inventory turnover trajectory — declining turns at flat margin is the warning signal. Customer concentration is rare; instead, supplier and franchise relationships are the dependencies. For Pharmacy and Gas Station, the 2021-22 data adds a layer of uncertainty: the post-pandemic economy materially shifted convenience-store traffic patterns and pharmacy reimbursement.",
    primary_metrics: [
      "gross_margin_pct",
      "ebitda_margin_pct",
      "inventory_turnover",
      "inventory_pct_assets",
      "current_ratio",
    ],
    secondary_metrics: [
      "dscr",
      "int_coverage",
      "operating_margin_pct",
      "debt_to_worth",
      "sales_to_assets",
    ],
    suppressible_metrics: [],
    durability_sensitive_metrics: [
      "gross_margin_pct",
      "inventory_turnover",
      "current_ratio",
    ],
    lender_sensitive_metrics: [
      "dscr",
      "current_ratio",
      "inventory_pct_assets",
    ],
    uncertainty_sensitive_metrics: [
      "gross_margin_pct",
      "ebitda_margin_pct",
      "revenue_cagr_3yr",
    ],
    static_mismatch_triggers: [
      {
        id: "ri-static-001",
        description: "Gross margin > 40% for grocery/c-store (top of category is Pharmacy at 29.7%; > 35% suggests product mix outlier or aggressive pricing)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ri-static-002",
        description: "Gross margin < 18% (suggests competitive pressure or product mix shift)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ri-static-003",
        description: "EBITDA margin > 10% (statistically very unusual; top of category is Gas Station at 6.5%)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "high",
      },
      {
        id: "ri-static-004",
        description: "Inventory turnover < 6x annually (signals slow-moving inventory; category typical is 10-25x)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ri-static-005",
        description: "Inventory % of assets < 12% (atypical — these are inventory-heavy businesses by definition)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ri-static-006",
        description: "Current ratio < 0.8 (working capital crisis; this category typically operates at 1.6-2.5x)",
        trigger_type: "static",
        basis: "both",
        severity_default: "high",
      },
    ],
    trajectory_mismatch_triggers: [
      {
        id: "ri-traj-001",
        description: "Inventory turnover declining 2+ consecutive years (slow-moving inventory accumulating; shrink rising)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "ri-traj-002",
        description: "Gross margin stable while inventory rising faster than revenue (mix shift toward lower-turn higher-margin items, or aged inventory masking decline)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "ri-traj-003",
        description: "Same-store sales declining while reported revenue rising from new locations",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "ri-traj-004",
        description: "AP days extending (working-capital stress; supplier-terms compression imminent)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "high",
      },
      {
        id: "ri-traj-005",
        description: "Supplier concentration intensifying (single wholesaler/franchisor % rising)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
    ],
    structural_uncertainty_signals: [
      {
        id: "ri-struct-001",
        description: "Independent vs franchise vs banner-affiliated unclear (royalty and supplier terms materially different)",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
      {
        id: "ri-struct-002",
        description: "Tobacco/lottery/alcohol revenue % not disclosed (regulated revenue with different margin and risk)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "ri-struct-003",
        description: "Fuel-vs-c-store revenue split not disclosed (Gas Stations particularly)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "ri-struct-004",
        description: "Online/delivery revenue mix unclear (Grocery, Pharmacy)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "ri-struct-005",
        description: "DIR fees and PBM contracts (Pharmacy) — full disclosure of reimbursement structure",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
    ],
    expected_source_standards: [
      {
        metric_or_input: "revenue",
        standard: "POS exports + tax_returns; daily sales reports preferred",
        minimum_source: "tax_returns",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "cogs",
        standard: "wholesaler/distributor invoices; inventory adjustments tracked separately",
        minimum_source: "internal_pnl",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "inventory",
        standard: "perpetual inventory system export; physical count required (especially for purchase-price-allocation)",
        minimum_source: "pos_exports",
        fraud_risk_flag_below_minimum: true,
      },
      {
        metric_or_input: "supplier_terms",
        standard: "actual supplier contracts and franchise agreements",
        minimum_source: "internal_pnl",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "shrink",
        standard: "POS variance reports; verbal_assertion of 'normal' triggers high uncertainty",
        minimum_source: "pos_exports",
        fraud_risk_flag_below_minimum: false,
      },
    ],
    expected_interaction_rule_ids: [
      "inventory_turnover_decline (trajectory signal)",
      "supplier_concentration (franchisor or wholesaler dependency)",
      "shrink_signal (inventory growth outpacing revenue)",
      "data_recency_warning (Pharmacy/Gas Station 2021-22 data)",
    ],
    expected_scenario_ids: [
      "industry_normalized — Margin normalization is the dominant scenario",
      "lender_stress — Standard compression; pair with inventory_writedown",
      "inventory_writedown — Shrink/obsolescence scenario (10% inventory writedown); informative for slow-turning categories",
      "supplier_terms_compress — Working capital cycle stress (AP days shorten by 10)",
    ],
    benchmark_confidence: [
      { metric: "Gross margin", confidence: "high", note: "confidence (n=173-519)" },
      { metric: "EBITDA margin", confidence: "high", note: "confidence for Grocery; MEDIUM for Pharmacy and Gas Station (2021-22 data)" },
      { metric: "DSCR", confidence: "high", note: "confidence (well-populated for retail)" },
      { metric: "Inventory turnover", confidence: "high", note: "confidence — the defining metric" },
      { metric: "general", confidence: "medium", note: "RECENCY CAVEAT: Pharmacy and Gas Station benchmarks predate substantial industry shifts (pharmacy DIR fees, c-store traffic patterns post-COVID, tobacco/fuel volume changes)" },
    ],
    expected_failure_modes: [
      "Inventory turnover decline post-close (mix shift, demand shift)",
      "Shrink / theft increase",
      "Supplier or franchisor terms compression",
      "Local competitive entry (especially c-store)",
      "Demographic shift in trade area",
      "Reimbursement compression (Pharmacy specifically — DIR fees, PBM pressure)",
      "Fuel margin compression (Gas Station)",
      "Cigarette tax / regulatory shift (Gas Station)",
    ],
    fragility_typical_dependencies: [
      "inventory_behavior_stability",
      "supplier_stability",
      "working_capital_stability",
      "pricing_power",
      "margin_sustainability",
    ],
    is_fallback: false,
    fallback_reason: "",
  },
  {
    key: "manufacturing",
    display_name: "Manufacturing",
    industries: [
      "signmaking",
      "commercialprinting",
    ],
    definition: "Build-to-order or build-to-stock production businesses with COGS, moderate inventory (13%), and capex sensitivity. Margins (EBITDA 9-10%) sit below contractors despite similar gross margins (37-46%) because of overhead structure. Capacity utilization is the dominant operational variable.",
    underwriter_reading: "Manufacturing businesses underwrite around three questions: capacity utilization (am I buying a fully-utilized line or excess capacity?), capex cycle (when's the next equipment refresh?), and customer concentration (job-shop vs catalog manufacturer). The 13% inventory pct is structurally correct — too low suggests stockouts or just-in-time discipline; too high suggests obsolete inventory or slow-moving SKUs.",
    primary_metrics: [
      "gross_margin_pct",
      "ebitda_margin_pct",
      "operating_margin_pct",
      "inventory_turnover",
      "sales_to_assets",
    ],
    secondary_metrics: [
      "dscr",
      "int_coverage",
      "current_ratio",
      "debt_to_worth",
      "ar_days",
    ],
    suppressible_metrics: [],
    durability_sensitive_metrics: [
      "gross_margin_pct",
      "operating_margin_pct",
      "inventory_turnover",
      "sales_to_assets",
    ],
    lender_sensitive_metrics: [
      "dscr",
      "int_coverage",
      "current_ratio",
    ],
    uncertainty_sensitive_metrics: [
      "operating_margin_pct",
      "revenue_cagr_3yr",
    ],
    static_mismatch_triggers: [
      {
        id: "mfg-static-001",
        description: "Gross margin > 55% (suggests specialty mix or potentially mismatched COGS classification)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "mfg-static-002",
        description: "Gross margin < 25% (suggests pricing pressure or material cost issues)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "mfg-static-003",
        description: "EBITDA margin > 16% (statistically unusual for this category)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "high",
      },
      {
        id: "mfg-static-004",
        description: "Inventory turnover < 3x (slow-moving or obsolete inventory signal)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "medium",
      },
      {
        id: "mfg-static-005",
        description: "Sales/assets ratio > 4 (suggests asset-light, possibly assembly rather than full manufacturing)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "mfg-static-006",
        description: "Capex implied < 2% of revenue (deferred capex risk in equipment-dependent business)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "medium",
      },
    ],
    trajectory_mismatch_triggers: [
      {
        id: "mfg-traj-001",
        description: "Capex declining while revenue rising (sales/assets ratio rising — deferred capex; capacity tightening)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "mfg-traj-002",
        description: "Gross margin expanding while revenue declining (mix shift toward higher-margin product but volume eroding — typically unsustainable)",
        trigger_type: "trajectory",
        basis: "conceptual",
        severity_default: "low",
      },
      {
        id: "mfg-traj-003",
        description: "Inventory turnover declining (slow-moving SKU accumulation; obsolescence risk)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "mfg-traj-004",
        description: "Customer concentration intensifying (top-customer % rising; job-shop drift)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
    ],
    structural_uncertainty_signals: [
      {
        id: "mfg-struct-001",
        description: "Custom-vs-catalog mix not disclosed (project-based custom mfg vs SKU-based catalog mfg are structurally different)",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
      {
        id: "mfg-struct-002",
        description: "Capacity utilization not disclosed (excess capacity available vs at-capacity materially different acquisition story)",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
      {
        id: "mfg-struct-003",
        description: "Technology obsolescence position (digital vs traditional — Comm Printing particularly)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "mfg-struct-004",
        description: "Make-vs-buy strategy unclear (vertical integration depth)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "mfg-struct-005",
        description: "Inventory categorization (raw materials, WIP, finished goods) not broken out",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
    ],
    expected_source_standards: [
      {
        metric_or_input: "revenue",
        standard: "tax_returns + ERP/MRP system export (Epicor, SAP Business One, MISys)",
        minimum_source: "tax_returns",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "gross_margin",
        standard: "ERP cost-of-goods detail; job-cost or work-order traceability",
        minimum_source: "internal_pnl",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "capex_history",
        standard: "Form 4562 + fixed-asset register",
        minimum_source: "internal_pnl",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "inventory_aging",
        standard: "ERP perpetual inventory; obsolescence reserve methodology disclosed",
        minimum_source: "internal_pnl",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "customer_concentration",
        standard: "ERP customer revenue export — top-10 with multi-year history",
        minimum_source: "internal_pnl",
        fraud_risk_flag_below_minimum: false,
      },
    ],
    expected_interaction_rule_ids: [
      "capacity_utilization_signal (sales/assets vs operating margin)",
      "customer_concentration_job_shop (project-based vs catalog manufacturer)",
      "capex_cycle_position (equipment age vs implied maintenance capex)",
      "supplier_concentration_materials",
    ],
    expected_scenario_ids: [
      "industry_normalized — Useful but the more important scenarios are capex-adjusted",
      "capex_normalized — Pull EBITDA down by typical maintenance capex (5-7% revenue)",
      "lender_stress — Standard compression",
      "supplier_terms_compress — Material cost spike scenario",
    ],
    benchmark_confidence: [
      { metric: "Gross margin", confidence: "high", note: "confidence (n=116-309)" },
      { metric: "EBITDA margin", confidence: "high", note: "confidence" },
      { metric: "Inventory turnover", confidence: "high", note: "confidence (the defining metric)" },
      { metric: "DSCR", confidence: "high", note: "confidence" },
      { metric: "general", confidence: "medium", note: "Sample sizes lower than other categories — Sign Mfg n=116 is the smaller of the two" },
    ],
    expected_failure_modes: [
      "Capacity utilization shift (loss of large customer creates excess capacity)",
      "Equipment refresh cycle (sudden capex requirement)",
      "Customer concentration (job-shop with 2-3 large accounts)",
      "Material cost shock without pass-through pricing",
      "Skilled labor (printers, fabricators) retention",
      "Technology obsolescence (digital displacing offset printing)",
      "Working capital expansion as revenue grows",
    ],
    fragility_typical_dependencies: [
      "capex_stability",
      "customer_retention",
      "supplier_stability",
      "working_capital_stability",
      "labor_retention",
      "pricing_power",
    ],
    is_fallback: false,
    fallback_reason: "",
  },
  {
    key: "ecommerce",
    display_name: "E-Commerce",
    industries: [
      "ecommerce",
    ],
    definition: "Online retail or DTC product businesses with very high inventory pct (40%), substantial advertising dependency, and working capital drag. RMA data is 2021-22, predating the post-COVID normalization of ecommerce economics; CAC has risen substantially since.",
    underwriter_reading: "E-commerce underwrites differently from any other category. The standard ratio analysis matters but is subordinate to three diligence axes: customer acquisition cost trajectory (rising fast in most categories since 2022), inventory aging and SKU performance distribution (often a small number of SKUs drive most revenue), and platform dependency (Amazon, Shopify, ads-platform algorithmic risk). The 2021-22 data adds a major recency caveat — the ecommerce environment of 2025-26 is materially different.",
    primary_metrics: [
      "gross_margin_pct",
      "ebitda_margin_pct",
      "inventory_turnover",
      "inventory_pct_assets",
      "ar_days",
    ],
    secondary_metrics: [
      "dscr",
      "operating_margin_pct",
      "current_ratio",
      "revenue_cagr_3yr",
    ],
    suppressible_metrics: [],
    durability_sensitive_metrics: [
      "gross_margin_pct",
      "inventory_turnover",
      "ebitda_margin_pct",
    ],
    lender_sensitive_metrics: [
      "dscr",
      "current_ratio",
      "inventory_pct_assets",
    ],
    uncertainty_sensitive_metrics: [
      "ebitda_margin_pct",
      "revenue_cagr_3yr",
      "inventory_turnover",
    ],
    static_mismatch_triggers: [
      {
        id: "ec-static-001",
        description: "Gross margin < 30% (suggests CAC-heavy, ads-dependent mix where contribution margin is thin)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ec-static-002",
        description: "Gross margin > 65% (suggests digital-product or service mix, atypical for inventory ecommerce)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ec-static-003",
        description: "EBITDA margin > 18% (top of category historically; post-2022 likely 5-10% range)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "medium",
      },
      {
        id: "ec-static-004",
        description: "Inventory turnover < 3x annually (slow-moving SKUs, working capital drag)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "medium",
      },
      {
        id: "ec-static-005",
        description: "Inventory pct of assets > 60% (over-inventoried; cash trap)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "medium",
      },
      {
        id: "ec-static-006",
        description: "Inventory pct of assets < 20% (under-inventoried for stated revenue; dropship or low-buffer model)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ec-static-007",
        description: "AR days > 15 (atypical — ecommerce typically cash-collection at platform; suggests B2B mix)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "ec-static-008",
        description: "DATA RECENCY: any conclusions from EBITDA or growth should carry an explicit 2021-22 caveat",
        trigger_type: "static",
        basis: "both",
        severity_default: "low",
      },
    ],
    trajectory_mismatch_triggers: [
      {
        id: "ec-traj-001",
        description: "Inventory growing faster than revenue (aging inventory accumulating; cash trap forming)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "ec-traj-002",
        description: "Gross margin compressing while revenue rising (advertising cost rising; product mix shifting toward lower-margin SKUs)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "ec-traj-003",
        description: "Customer acquisition cost rising while LTV stable (unit economics deteriorating; classic 2022-2024 pattern)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "ec-traj-004",
        description: "Platform concentration intensifying (Amazon % of revenue rising — platform-risk exposure growing)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "ec-traj-005",
        description: "Return rate rising (quality issues or product-market-fit drift)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
    ],
    structural_uncertainty_signals: [
      {
        id: "ec-struct-001",
        description: "Platform mix unclear (Amazon FBA vs Shopify DTC vs marketplace — entirely different economics)",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
      {
        id: "ec-struct-002",
        description: "Customer acquisition cost not disclosed (the single most important post-2022 metric)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "ec-struct-003",
        description: "Inventory aging not disclosed at SKU level (long-tail SKU exposure)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "ec-struct-004",
        description: "Returns and refund treatment not disclosed",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "ec-struct-005",
        description: "Hybrid model (D2C + wholesale + retail) without revenue split",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
      {
        id: "ec-struct-006",
        description: "Brand-vs-resale split not disclosed (private label vs reselling other brands)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
    ],
    expected_source_standards: [
      {
        metric_or_input: "revenue",
        standard: "POS exports (Shopify, Amazon Seller Central, marketplace exports) + tax_returns",
        minimum_source: "tax_returns",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "cac_data",
        standard: "advertising platform exports (Meta, Google Ads, TikTok) + attribution data",
        minimum_source: "pos_exports",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "inventory",
        standard: "platform inventory module + 3PL warehouse system export",
        minimum_source: "pos_exports",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "customer_data",
        standard: "platform export with cohort breakdown; LTV calculation methodology disclosed",
        minimum_source: "pos_exports",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "returns_data",
        standard: "platform return-rate export with multi-year history",
        minimum_source: "internal_pnl",
        fraud_risk_flag_below_minimum: false,
      },
    ],
    expected_interaction_rule_ids: [
      "cac_dependency_signal (advertising spend ratio not provided / not stable)",
      "platform_concentration_risk (Amazon FBA, Shopify dependency)",
      "inventory_aging_concern (turnover declining or SKU concentration)",
      "data_recency_warning (2021-22 RMA benchmarks)",
      "working_capital_drag (high inventory pct + payable cycle mismatch)",
    ],
    expected_scenario_ids: [
      "industry_normalized — Less reliable due to data recency; deprioritize",
      "cac_normalized — Pull contribution margin down by 200-400 bps (CAC inflation since 2022)",
      "inventory_writedown — Aged inventory scenario (20% writedown on inventory > 180 days)",
      "lender_stress — Standard compression; informative when paired with CAC normalization",
      "platform_disruption — Algorithm or platform-policy event (revenue -25%)",
    ],
    benchmark_confidence: [
      { metric: "Gross margin", confidence: "medium", note: "confidence (n=129, 2021-22 data)" },
      { metric: "EBITDA margin", confidence: "low", note: "confidence (2021-22 — pre-CAC inflation environment)" },
      { metric: "Inventory turnover", confidence: "medium", note: "confidence (likely meaningfully different in 2025-26)" },
      { metric: "DSCR", confidence: "medium", note: "confidence" },
      { metric: "general", confidence: "medium", note: "RECENCY CAVEAT: All ecommerce benchmarks predate the 2022-2024 CAC inflation and platform-economics shift" },
    ],
    expected_failure_modes: [
      "Customer acquisition cost has inflated post-data-collection (most common)",
      "Inventory aging revealed during diligence (long tail of slow SKUs)",
      "Platform dependency (Amazon suspension, Shopify policy change)",
      "Ad-platform algorithm shift compressing ROAS",
      "Supplier or 3PL transition disruption",
      "Returns rate elevated post-close",
      "Tariff or import cost shock for goods-sold-online",
      "Capital constraint preventing inventory buy ahead of seasonal cycle",
    ],
    fragility_typical_dependencies: [
      "inventory_behavior_stability",
      "supplier_stability",
      "margin_sustainability",
      "working_capital_stability",
      "pricing_power",
      "transition_execution",
    ],
    is_fallback: false,
    fallback_reason: "",
  },
  {
    key: "restaurant",
    display_name: "Restaurant",
    industries: [
      "restaurant",
    ],
    definition: "Full-service restaurants with very high gross margin (62%) and very low EBITDA margin (8%) — the gap is labor, rent, and utilities. Labor pressure has compressed margins industry-wide since 2021. Lease structure, labor availability, and concept-relevance drive durability.",
    underwriter_reading: "The single most diagnostic ratio for restaurants is the gap between gross margin (62%) and EBITDA margin (8%) — 54 percentage points absorbed by labor (~30%), rent (~8%), utilities/operations (~16%). A restaurant with EBITDA above category median typically has either favorable lease economics, owner-operator labor (under-reported in add-backs), or a counter-service / limited-labor concept. The underwriter looks at: lease term remaining, labor cost trajectory, and recent same-store sales.",
    primary_metrics: [
      "gross_margin_pct",
      "ebitda_margin_pct",
      "operating_margin_pct",
      "current_ratio",
    ],
    secondary_metrics: [
      "dscr",
      "int_coverage",
      "debt_to_worth",
      "revenue_cagr_3yr",
    ],
    suppressible_metrics: [
      "inventory_turnover",
      "days_inventory_outstanding",
    ],
    durability_sensitive_metrics: [
      "gross_margin_pct",
      "ebitda_margin_pct",
      "revenue_cagr_3yr",
    ],
    lender_sensitive_metrics: [
      "dscr",
      "int_coverage",
      "current_ratio",
    ],
    uncertainty_sensitive_metrics: [
      "ebitda_margin_pct",
      "revenue_cagr_3yr",
    ],
    static_mismatch_triggers: [
      {
        id: "rs-static-001",
        description: "Gross margin < 55% (food cost issue or pricing problem)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "medium",
      },
      {
        id: "rs-static-002",
        description: "Gross margin > 70% (suggests bar/beverage-heavy mix, atypical for full-service)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "rs-static-003",
        description: "EBITDA margin > 14% (significantly above category; suggests under-reported labor or limited-service concept)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "rs-static-004",
        description: "EBITDA margin < 4% (deep operating issue)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "medium",
      },
      {
        id: "rs-static-005",
        description: "Operating margin > 12% (atypical — implies extraordinary lease or labor economics)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "rs-static-006",
        description: "Current ratio < 0.8 (cash flow stress)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "medium",
      },
      {
        id: "rs-static-007",
        description: "Revenue CAGR < -10% (declining concept or trade-area issue)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "medium",
      },
    ],
    trajectory_mismatch_triggers: [
      {
        id: "rs-traj-001",
        description: "Labor cost as % of revenue rising 200+ bps/year without pricing adjustment (margin compression imminent)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "high",
      },
      {
        id: "rs-traj-002",
        description: "Same-store sales declining while reported revenue stable (concept decline or trade-area shift)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "rs-traj-003",
        description: "Lease cost % rising (lease step or renewal pressure imminent)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "high",
      },
      {
        id: "rs-traj-004",
        description: "Food cost % rising while menu prices flat (margin compression unaddressed)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "rs-traj-005",
        description: "Owner-operator hours declining while operating margin stable (under-reported labor surfacing)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
    ],
    structural_uncertainty_signals: [
      {
        id: "rs-struct-001",
        description: "Full-service vs counter-service vs hybrid concept (labor profile materially different)",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
      {
        id: "rs-struct-002",
        description: "Alcohol revenue % not disclosed (bar-heavy vs food-heavy has different margin and risk profile)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "rs-struct-003",
        description: "Delivery channel mix unclear (own delivery vs DoorDash/UberEats — different commission structure)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "rs-struct-004",
        description: "Catering or private-event revenue mixed in (different unit economics)",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
      {
        id: "rs-struct-005",
        description: "Multi-unit with location-level economics not disclosed",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
    ],
    expected_source_standards: [
      {
        metric_or_input: "revenue",
        standard: "POS exports (Toast, Square for Restaurants) + tax_returns; daily sales required",
        minimum_source: "tax_returns",
        fraud_risk_flag_below_minimum: true,
      },
      {
        metric_or_input: "food_cost",
        standard: "supplier invoices; inventory count required",
        minimum_source: "internal_pnl",
        fraud_risk_flag_below_minimum: true,
      },
      {
        metric_or_input: "labor_cost",
        standard: "payroll_filings + POS labor module (scheduling vs actual)",
        minimum_source: "payroll_filings",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "lease",
        standard: "actual lease documents required",
        minimum_source: "internal_pnl",
        fraud_risk_flag_below_minimum: true,
      },
      {
        metric_or_input: "alcohol_revenue",
        standard: "POS export categorizing beer/wine/spirits; required for license-transfer analysis",
        minimum_source: "pos_exports",
        fraud_risk_flag_below_minimum: true,
      },
    ],
    expected_interaction_rule_ids: [
      "labor_compression_signal (EBITDA below median + tight labor market)",
      "lease_event_exposure (lease term remaining)",
      "concept_relevance_decline (revenue CAGR negative)",
      "owner_operator_labor_understated (atypically high EBITDA)",
      "alcohol_license_dependency (license transferability)",
    ],
    expected_scenario_ids: [
      "industry_normalized — Useful at margin",
      "labor_stress — Wage +10% scenario (informative because labor is 30% of revenue)",
      "lender_stress — Standard compression",
      "lease_renewal — Rent +20% scenario for restaurants with < 3 years on lease",
      "buyer_downside — Same-store-sales decline scenario (-15%)",
    ],
    benchmark_confidence: [
      { metric: "Gross margin", confidence: "high", note: "confidence (n=1,596 — largest sample in the dataset)" },
      { metric: "EBITDA margin", confidence: "high", note: "confidence but the median masks bimodal distribution (counter-service vs full-service)" },
      { metric: "DSCR", confidence: "high", note: "confidence" },
      { metric: "Operating margin", confidence: "high", note: "confidence" },
    ],
    expected_failure_modes: [
      "Lease renewal at materially higher rent",
      "Labor cost compression exceeds modeled (wage inflation persists)",
      "Concept decline or trade-area shift",
      "Owner-chef departure (key-person)",
      "Health/safety event affecting revenue",
      "Alcohol license non-transfer",
      "Equipment lifecycle (kitchen capex)",
      "Same-store sales decline post-acquisition",
    ],
    fragility_typical_dependencies: [
      "labor_retention",
      "pricing_power",
      "key_person_transferability",
      "transition_execution",
      "customer_retention",
    ],
    is_fallback: false,
    fallback_reason: "",
  },
  {
    key: "software",
    display_name: "Software",
    industries: [
      "saas",
    ],
    definition: "Subscription software businesses with high implied gross margin (RMA reports no COGS for the category, but actual gross margins typically 70-85%), low inventory, recurring revenue, and customer acquisition cost as the dominant economic variable. RMA data is 2021-22.",
    underwriter_reading: "Software underwrites around different metrics than RMA reports. The underwriter's first questions are: net revenue retention (best single indicator), gross revenue retention (churn floor), customer acquisition cost payback period, and rule-of-40. RMA's EBITDA-margin-and-coverage view misses the dominant operating variables. The 2021-22 data was captured before the substantial 2023-2024 software valuation compression and is materially less reliable for benchmarking.",
    primary_metrics: [
      "ebitda_margin_pct",
      "operating_margin_pct",
      "current_ratio",
      "revenue_cagr_3yr",
    ],
    secondary_metrics: [
      "dscr",
      "int_coverage",
      "debt_to_worth",
    ],
    suppressible_metrics: [
      "inventory_turnover",
      "days_inventory_outstanding",
      "inventory_pct_assets",
      "gross_margin_pct",
    ],
    durability_sensitive_metrics: [
      "ebitda_margin_pct",
      "revenue_cagr_3yr",
    ],
    lender_sensitive_metrics: [
      "dscr",
      "current_ratio",
      "revenue_cagr_3yr",
    ],
    uncertainty_sensitive_metrics: [
      "ebitda_margin_pct",
      "revenue_cagr_3yr",
    ],
    static_mismatch_triggers: [
      {
        id: "sw-static-001",
        description: "EBITDA margin > 30% with revenue CAGR > 30% (statistically rare; verify both — likely one is overstated)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "medium",
      },
      {
        id: "sw-static-002",
        description: "EBITDA margin < 0% with strong CAGR (early-stage growth, atypical for SBA-financeable acquisition)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "sw-static-003",
        description: "Current ratio < 1.0 (working capital stress, atypical for subscription model)",
        trigger_type: "static",
        basis: "both",
        severity_default: "medium",
      },
      {
        id: "sw-static-004",
        description: "Revenue CAGR < 0% (declining ARR, fundamental durability question)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "medium",
      },
      {
        id: "sw-static-005",
        description: "Inventory pct > 3% (likely services or hardware component, not pure software)",
        trigger_type: "static",
        basis: "statistical",
        severity_default: "medium",
      },
      {
        id: "sw-static-006",
        description: "DATA RECENCY: 2021-22 benchmarks reflect pre-compression valuation environment",
        trigger_type: "static",
        basis: "both",
        severity_default: "low",
      },
    ],
    trajectory_mismatch_triggers: [
      {
        id: "sw-traj-001",
        description: "Net revenue retention declining 2+ consecutive periods (churn or down-sell accelerating — the single most important software signal)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "sw-traj-002",
        description: "Customer acquisition cost rising while ACV stable (CAC payback period extending)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "sw-traj-003",
        description: "Revenue growth slowing while marketing spend rising (efficiency declining)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "sw-traj-004",
        description: "Top-customer % of ARR rising (concentration intensifying)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
      {
        id: "sw-traj-005",
        description: "Gross margin compressing (hosting cost rising faster than revenue, or services revenue mix increasing)",
        trigger_type: "trajectory",
        basis: "both",
        severity_default: "low",
      },
    ],
    structural_uncertainty_signals: [
      {
        id: "sw-struct-001",
        description: "Subscription vs perpetual-license vs services mix not disclosed",
        escalates: "model_uncertainty",
        escalation_points: 10,
      },
      {
        id: "sw-struct-002",
        description: "ARR vs revenue distinction unclear (one-time vs recurring not separated)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "sw-struct-003",
        description: "Net revenue retention not calculated or methodology unclear",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "sw-struct-004",
        description: "Customer cohort data not provided (single most important durability signal)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "sw-struct-005",
        description: "AI displacement risk position not assessed (especially low-defensibility verticals)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
      {
        id: "sw-struct-006",
        description: "Platform/integration dependency not disclosed (Salesforce/Shopify/AWS lock-in)",
        escalates: "structural_uncertainty",
        escalation_points: 7,
      },
    ],
    expected_source_standards: [
      {
        metric_or_input: "revenue",
        standard: "Billing system export (Stripe, Chargebee, Recurly) + tax_returns",
        minimum_source: "tax_returns",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "arr_metrics",
        standard: "billing system or CRM export with cohort breakdown; seller_spreadsheet methodology must be transparent",
        minimum_source: "seller_spreadsheet",
        fraud_risk_flag_below_minimum: true,
      },
      {
        metric_or_input: "churn_retention",
        standard: "billing system export — non-negotiable for any retention claim",
        minimum_source: "pos_exports",
        fraud_risk_flag_below_minimum: true,
      },
      {
        metric_or_input: "customer_concentration",
        standard: "billing system export — top-10 with multi-year ARR trajectory",
        minimum_source: "pos_exports",
        fraud_risk_flag_below_minimum: false,
      },
      {
        metric_or_input: "cac_data",
        standard: "advertising platform exports + attribution; payback methodology disclosed",
        minimum_source: "pos_exports",
        fraud_risk_flag_below_minimum: false,
      },
    ],
    expected_interaction_rule_ids: [
      "data_recency_warning (2021-22 RMA benchmarks)",
      "missing_saas_metrics (NRR, GRR, CAC payback not in standard input)",
      "rule_of_40_proxy (margin + growth combined view)",
      "customer_concentration_signal (top-10 customer % of ARR)",
      "platform_or_partnership_dependency",
    ],
    expected_scenario_ids: [
      "industry_normalized — LOW reliability for this category given data recency",
      "churn_normalized — GRR pulled to 85% scenario (informative substitute)",
      "lender_stress — Standard compression; informative because recurring revenue gives the case for resilience",
      "rule_of_40_decay — Growth + margin combined compression scenario",
    ],
    benchmark_confidence: [
      { metric: "EBITDA margin", confidence: "low", note: "confidence (2021-22 data; valuation/economics shifted materially since)" },
      { metric: "Operating margin", confidence: "low", note: "confidence" },
      { metric: "DSCR", confidence: "medium", note: "confidence" },
      { metric: "Revenue CAGR", confidence: "low", note: "confidence (2021-22 reflects ZIRP-era growth assumptions)" },
      { metric: "general", confidence: "medium", note: "RECENCY CAVEAT: Every metric in this category should carry an explicit data-recency warning" },
    ],
    expected_failure_modes: [
      "Net revenue retention declining (churn accelerating)",
      "CAC payback period extending (post-2022 ad economics)",
      "Customer concentration in renewal cycle (single large customer with 30%+ ARR)",
      "Platform dependency (built on AWS/Salesforce/Shopify infrastructure)",
      "Founder/CTO dependency (transferability of technical leadership)",
      "Pricing pressure from competitor or downward repricing event",
      "Product-market-fit drift (revenue growing but unit economics decaying)",
      "AI displacement risk (especially for low-defensibility categories)",
    ],
    fragility_typical_dependencies: [
      "customer_retention",
      "recurring_revenue_persistence",
      "key_person_transferability",
      "pricing_power",
      "margin_sustainability",
    ],
    is_fallback: false,
    fallback_reason: "",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK FINGERPRINT
// ─────────────────────────────────────────────────────────────────────────────
// Industries not present in INDUSTRY_TO_MODEL receive this fingerprint.
// The engine does not perform runtime nearest-neighbor classification (per
// v2 design decision). Fallback is conservative and explicit, and surfaces
// elevated underwriting_uncertainty automatically.

export const FALLBACK_FINGERPRINT: IndustryFingerprint = {
  key: "professional_services", // sentinel — actual fallback behavior driven by is_fallback flag
  display_name: "Fallback (industry not in registry)",
  industries: [],
  definition:
    "Generic service-model defaults applied to industries not yet in the " +
    "registry. The engine treats fallback-fingerprint deals as inherently " +
    "harder to underwrite, reflecting the absence of industry-specific priors.",
  underwriter_reading:
    "Without industry-specific priors, the engine cannot calibrate mismatch " +
    "expectations or operating-model rules to this deal. Treat conclusions " +
    "as directional rather than diagnostic.",
  primary_metrics: ["sde_margin_pct", "current_ratio", "dscr", "revenue_cagr_3yr"],
  secondary_metrics: ["operating_margin_pct", "int_coverage", "debt_to_worth"],
  suppressible_metrics: ["inventory_turnover", "days_inventory_outstanding", "gross_margin_pct"],
  durability_sensitive_metrics: ["sde_margin_pct", "current_ratio"],
  lender_sensitive_metrics: ["dscr", "current_ratio"],
  uncertainty_sensitive_metrics: ["sde_margin_pct", "revenue_cagr_3yr"],
  static_mismatch_triggers: [],
  trajectory_mismatch_triggers: [],
  structural_uncertainty_signals: [
    {
      id: "fallback-struct-001",
      description: "Industry not present in registry — all structural-prior expectations are absent",
      escalates: "model_uncertainty",
      escalation_points: 25,
    },
  ],
  expected_source_standards: [],
  expected_interaction_rule_ids: [],
  expected_scenario_ids: ["industry_normalized", "lender_stress"],
  benchmark_confidence: [
    { metric: "All metrics", confidence: "low", note: "No industry-specific RMA benchmarks; comparisons use cross-industry defaults" },
  ],
  expected_failure_modes: [
    "Industry-specific risks not anticipated by the generic fingerprint",
    "Operating-model assumptions may not match the actual business",
  ],
  fragility_typical_dependencies: [
    "add_back_integrity", "revenue_quality", "customer_retention",
  ],
  is_fallback: true,
  fallback_reason: "Industry not present in the registry; explicit registry addition required to retire this fallback assignment.",
};

// ─────────────────────────────────────────────────────────────────────────────
// PER-INDUSTRY OVERRIDES
// ─────────────────────────────────────────────────────────────────────────────
// 41 entries — one per industry in the registry. Captures RMA-data-driven
// deviations (recency penalties, small samples, proxy benchmarks) and the
// industry-specific structural notes from Section 6 of the constitution.

export const INDUSTRY_OVERRIDES: ReadonlyArray<IndustryOverride> = [
  {
    industry_key: "cpa",
    model_key: "professional_services",
    display_name: "CPA / Accounting",
    naics_code: "541211",
    rma_sample_size: 371,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "landscaping",
    model_key: "field_service",
    display_name: "Landscaping",
    naics_code: "561730",
    rma_sample_size: 527,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "autorepair",
    model_key: "service_with_inventory",
    display_name: "Auto Repair",
    naics_code: "811111",
    rma_sample_size: 350,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "carwash",
    model_key: "asset_heavy_service",
    display_name: "Car Wash",
    naics_code: "811192",
    rma_sample_size: 257,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "janitorial",
    model_key: "field_service",
    display_name: "Janitorial / Cleaning",
    naics_code: "561720",
    rma_sample_size: 244,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "childcare",
    model_key: "consumer_service",
    display_name: "Child Care",
    naics_code: "624410",
    rma_sample_size: 474,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "dentist",
    model_key: "healthcare_practice",
    display_name: "Dentist",
    naics_code: "621210",
    rma_sample_size: 1163,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [
      {
        axis: "rule_suppression",
        modification: "Suppress debt-to-worth mismatch triggers; use debt-to-SDE as primary leverage metric",
        rationale: "Dentists routinely operate with negative book equity due to practice loans. Debt-to-worth structurally meaningless for this industry.",
      },
    ],
  },
  {
    industry_key: "ecommerce",
    model_key: "ecommerce",
    display_name: "E-Commerce *",
    naics_code: "454110",
    rma_sample_size: 129,
    rma_data_year: "2021-22",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [
      {
        axis: "evidence_quality",
        modification: "Reduce evidence_quality by 15 points",
        rationale: "2021-22 RMA data predates substantial industry-specific shifts. Engine surfaces explicit data_recency_warning interaction signal on every deal in this industry.",
      },
    ],
  },
  {
    industry_key: "electrical",
    model_key: "contractor",
    display_name: "Electrical Contr.",
    naics_code: "238210",
    rma_sample_size: 794,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "fitness",
    model_key: "asset_heavy_service",
    display_name: "Fitness / Rec Sports",
    naics_code: "713940",
    rma_sample_size: 324,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "physician",
    model_key: "healthcare_practice",
    display_name: "Physician Office",
    naics_code: "621111",
    rma_sample_size: 2005,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [
      {
        axis: "underwriting_uncertainty",
        modification: "Provider-density and key-person concentration treated as elevated by default; structural_uncertainty sub-axis amplified",
        rationale: "Largest sample in registry (n=2,005). Solo-practice deals concentrate revenue on one provider's panel.",
      },
    ],
  },
  {
    industry_key: "hvac",
    model_key: "contractor",
    display_name: "HVAC Contr.",
    naics_code: "238220",
    rma_sample_size: 819,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "insurance",
    model_key: "professional_services",
    display_name: "Insurance Agency",
    naics_code: "524210",
    rma_sample_size: 308,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "medspa",
    model_key: "healthcare_practice",
    display_name: "Med Spa (= Physician)",
    naics_code: "621111",
    rma_sample_size: 2005,
    rma_data_year: "2025-26",
    is_proxy_benchmark: true,
    proxy_source_industry: "physician",
    behavior_modifications: [
      {
        axis: "evidence_quality",
        modification: "Reduce evidence_quality by 12 points on top of normal calculation; suppress reimbursement-related rules; emphasize cosmetic-pricing-power and discretionary-demand rules",
        rationale: "Shares NAICS 621111 (Physician Office) data — known proxy. Cash-pay cosmetic economics differ from general medical.",
      },
    ],
  },
  {
    industry_key: "plumbing",
    model_key: "contractor",
    display_name: "Plumbing (= HVAC)",
    naics_code: "238220",
    rma_sample_size: 819,
    rma_data_year: "2025-26",
    is_proxy_benchmark: true,
    proxy_source_industry: null,
    behavior_modifications: [
      {
        axis: "evidence_quality",
        modification: "Reduce evidence_quality by 8 points",
        rationale: "Shares NAICS 238220 data with HVAC Contractor — known proxy.",
      },
    ],
  },
  {
    industry_key: "laundry",
    model_key: "consumer_service",
    display_name: "Laundry / Dryclean",
    naics_code: "812320",
    rma_sample_size: 54,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [
      {
        axis: "evidence_quality",
        modification: "Reduce evidence_quality by 8 points; downgrade statistical mismatch triggers to directional only",
        rationale: "RMA n=54 is below the typical confidence threshold (~100). Percentile positioning carries wider uncertainty bands.",
      },
    ],
  },
  {
    industry_key: "painting",
    model_key: "contractor",
    display_name: "Painting Contr.",
    naics_code: "238320",
    rma_sample_size: 112,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "petcare",
    model_key: "consumer_service",
    display_name: "Pet Care (non-Vet)",
    naics_code: "812910",
    rma_sample_size: 72,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [
      {
        axis: "evidence_quality",
        modification: "Reduce evidence_quality by 8 points; downgrade statistical mismatch triggers to directional only",
        rationale: "RMA n=72 is below the typical confidence threshold (~100). Percentile positioning carries wider uncertainty bands.",
      },
    ],
  },
  {
    industry_key: "pharmacy",
    model_key: "retail_inventory",
    display_name: "Pharmacy *",
    naics_code: "446110",
    rma_sample_size: 173,
    rma_data_year: "2021-22",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [
      {
        axis: "evidence_quality",
        modification: "Reduce evidence_quality by 18 points",
        rationale: "2021-22 RMA data predates substantial industry-specific shifts. Engine surfaces explicit data_recency_warning interaction signal on every deal in this industry.",
      },
    ],
  },
  {
    industry_key: "commercialprinting",
    model_key: "manufacturing",
    display_name: "Comm. Printing",
    naics_code: "323111",
    rma_sample_size: 309,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "restaurant",
    model_key: "restaurant",
    display_name: "Restaurant (Full Svc)",
    naics_code: "722511",
    rma_sample_size: 1596,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "roofing",
    model_key: "contractor",
    display_name: "Roofing Contr.",
    naics_code: "238160",
    rma_sample_size: 264,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "saas",
    model_key: "software",
    display_name: "SaaS / Software *",
    naics_code: "511210",
    rma_sample_size: 156,
    rma_data_year: "2021-22",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [
      {
        axis: "evidence_quality",
        modification: "Reduce evidence_quality by 15 points",
        rationale: "2021-22 RMA data predates substantial industry-specific shifts. Engine surfaces explicit data_recency_warning interaction signal on every deal in this industry.",
      },
    ],
  },
  {
    industry_key: "securitysystems",
    model_key: "field_service",
    display_name: "Security Systems",
    naics_code: "561621",
    rma_sample_size: 147,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "selfstorage",
    model_key: "asset_heavy_service",
    display_name: "Self-Storage",
    naics_code: "531130",
    rma_sample_size: 230,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [
      {
        axis: "fingerprint_metric_threshold",
        modification: "Treat operating margin as primary profitability signal; weight LTV as dominant lender metric; emphasize capex_stability assumption",
        rationale: "EBITDA margin 52.8% inflated by real-estate D&A. Real-estate-dominant economics.",
      },
    ],
  },
  {
    industry_key: "trucking",
    model_key: "asset_heavy_service",
    display_name: "Trucking (Local)",
    naics_code: "484110",
    rma_sample_size: 654,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "hairsalon",
    model_key: "consumer_service",
    display_name: "Beauty Salons",
    naics_code: "812112",
    rma_sample_size: 92,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [
      {
        axis: "evidence_quality",
        modification: "Reduce evidence_quality by 8 points; downgrade statistical mismatch triggers to directional only",
        rationale: "RMA n=92 is below the typical confidence threshold (~100). Percentile positioning carries wider uncertainty bands.",
      },
    ],
  },
  {
    industry_key: "otherspecconstr",
    model_key: "contractor",
    display_name: "Other Spec. Constr.",
    naics_code: "238990",
    rma_sample_size: 792,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "grocery",
    model_key: "retail_inventory",
    display_name: "Grocery / Supermarket",
    naics_code: "445110",
    rma_sample_size: 381,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "pestcontrol",
    model_key: "field_service",
    display_name: "Pest Control",
    naics_code: "561710",
    rma_sample_size: 79,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [
      {
        axis: "evidence_quality",
        modification: "Reduce evidence_quality by 8 points; downgrade statistical mismatch triggers to directional only",
        rationale: "RMA n=79 is below the typical confidence threshold (~100). Percentile positioning carries wider uncertainty bands.",
      },
    ],
  },
  {
    industry_key: "marketing",
    model_key: "professional_services",
    display_name: "Marketing & Advert.",
    naics_code: "541810",
    rma_sample_size: 198,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "engineering",
    model_key: "professional_services",
    display_name: "Engineering Svcs",
    naics_code: "541330",
    rma_sample_size: 1015,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "veterinary",
    model_key: "healthcare_practice",
    display_name: "Veterinary",
    naics_code: "541940",
    rma_sample_size: 217,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [
      {
        axis: "fingerprint_metric_threshold",
        modification: "Recalibrate 'inventory > 8%' mismatch trigger to 'inventory > 10%' for veterinary; suppress reimbursement_stability dependency in favor of pricing_power",
        rationale: "Inventory 6.4% reflects pharmaceutical/supply stock — atypical for healthcare_practice but structurally correct for vet. Cash-pay status eliminates reimbursement risk.",
      },
    ],
  },
  {
    industry_key: "realestatebrok",
    model_key: "professional_services",
    display_name: "RE Broker / Agent",
    naics_code: "531210",
    rma_sample_size: 347,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "propertymanage",
    model_key: "professional_services",
    display_name: "RE Prop. Manager",
    naics_code: "531311",
    rma_sample_size: 311,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "homehealth",
    model_key: "healthcare_practice",
    display_name: "Home Health Care",
    naics_code: "621610",
    rma_sample_size: 265,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "physicaltherapy",
    model_key: "healthcare_practice",
    display_name: "PT / Chiro / Therapy",
    naics_code: "621340",
    rma_sample_size: 147,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "gasstation",
    model_key: "retail_inventory",
    display_name: "Gas Station / C-Store *",
    naics_code: "447110",
    rma_sample_size: 519,
    rma_data_year: "2021-22",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [
      {
        axis: "evidence_quality",
        modification: "Reduce evidence_quality by 18 points",
        rationale: "2021-22 RMA data predates substantial industry-specific shifts. Engine surfaces explicit data_recency_warning interaction signal on every deal in this industry.",
      },
    ],
  },
  {
    industry_key: "remodeling",
    model_key: "contractor",
    display_name: "Home Renovation",
    naics_code: "236118",
    rma_sample_size: 180,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "staffing",
    model_key: "professional_services",
    display_name: "Staffing / Employ.",
    naics_code: "561311",
    rma_sample_size: 322,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
  {
    industry_key: "signmaking",
    model_key: "manufacturing",
    display_name: "Sign Mfg.",
    naics_code: "339950",
    rma_sample_size: 116,
    rma_data_year: "2025-26",
    is_proxy_benchmark: false,
    proxy_source_industry: null,
    behavior_modifications: [],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the fingerprint for an operating model key.
 * Internal-precision API (returns null on miss).
 */
export function getFingerprint(modelKey: OperatingModelKey): IndustryFingerprint | null {
  return FINGERPRINTS.find((f) => f.key === modelKey) ?? null;
}

/**
 * Return the per-industry override for a given industry.
 */
export function getIndustryOverride(industryKey: IndustryKey): IndustryOverride | null {
  return INDUSTRY_OVERRIDES.find((o) => o.industry_key === industryKey) ?? null;
}

/**
 * Fallback-aware fingerprint resolution. The orchestrator and high-level
 * consumers call this; it never throws. Unknown industries degrade
 * gracefully to the fallback fingerprint while surfacing the fallback
 * as explicit underwriting intelligence.
 *
 * A fallback resolution is never neutral — it carries explicit
 * model_uncertainty escalation that downstream modules respect.
 */
export function resolveFingerprint(industryKey: string): FingerprintResolution {
  const known = INDUSTRY_TO_MODEL[industryKey as IndustryKey];
  if (!known) {
    return {
      fingerprint: FALLBACK_FINGERPRINT,
      industry_override: null,
      is_fallback: true,
      fallback_reason: `Industry "${industryKey}" not present in registry`,
      model_uncertainty_escalation: 25,
      structural_uncertainty_escalation: 10,
    };
  }
  const fingerprint = getFingerprint(known);
  if (!fingerprint) {
    // Should never happen given INDUSTRY_TO_MODEL governance, but fail-safe.
    return {
      fingerprint: FALLBACK_FINGERPRINT,
      industry_override: null,
      is_fallback: true,
      fallback_reason: `Operating model "${known}" mapped but no fingerprint registered`,
      model_uncertainty_escalation: 25,
      structural_uncertainty_escalation: 15,
    };
  }
  const override = getIndustryOverride(industryKey as IndustryKey);
  let structuralEscalation = 0;
  let modelEscalation = 0;
  if (override) {
    if (override.is_proxy_benchmark) modelEscalation += 8;
    if (override.rma_data_year === "2021-22") modelEscalation += 5;
    if (override.rma_sample_size > 0 && override.rma_sample_size < 100) {
      structuralEscalation += 5;
    }
  }
  return {
    fingerprint,
    industry_override: override,
    is_fallback: false,
    fallback_reason: "",
    model_uncertainty_escalation: modelEscalation,
    structural_uncertainty_escalation: structuralEscalation,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

interface FingerprintRegistryValidationResult {
  readonly ok: boolean;
  readonly issues: Array<{ severity: "error" | "warning"; location: string; message: string }>;
  readonly fingerprint_count: number;
  readonly override_count: number;
  readonly total_static_triggers: number;
  readonly total_trajectory_triggers: number;
  readonly total_uncertainty_signals: number;
  readonly total_source_standards: number;
  readonly total_failure_modes: number;
  readonly version: string;
}

export function validateFingerprintRegistry(): FingerprintRegistryValidationResult {
  const issues: Array<{ severity: "error" | "warning"; location: string; message: string }> = [];
  const knownAssumptionKeys = new Set<string>(ASSUMPTIONS.map((a) => a.key));
  const knownMetricKeys = new Set<string>(METRIC_RELEVANCE.map((m) => m.metric_key));
  const knownIndustryKeys = new Set<string>(Object.keys(INDUSTRY_TO_MODEL));
  const knownModelKeys = new Set<string>(FINGERPRINTS.map((f) => f.key));

  // ── Every industry assignment must reference a known fingerprint ────────
  for (const [indKey, modelKey] of Object.entries(INDUSTRY_TO_MODEL)) {
    if (!knownModelKeys.has(modelKey)) {
      issues.push({
        severity: "error",
        location: `INDUSTRY_TO_MODEL[${indKey}]`,
        message: `References unknown operating model: ${modelKey}`,
      });
    }
  }

  // ── Every fingerprint's industries must be in INDUSTRY_TO_MODEL ─────────
  for (const f of FINGERPRINTS) {
    for (const ind of f.industries) {
      if (!knownIndustryKeys.has(ind)) {
        issues.push({
          severity: "error",
          location: `fingerprint[${f.key}].industries`,
          message: `Industry "${ind}" not in INDUSTRY_TO_MODEL`,
        });
      } else if (INDUSTRY_TO_MODEL[ind as IndustryKey] !== f.key) {
        issues.push({
          severity: "error",
          location: `fingerprint[${f.key}].industries`,
          message: `Industry "${ind}" maps to "${INDUSTRY_TO_MODEL[ind as IndustryKey]}" not "${f.key}"`,
        });
      }
    }
  }

  // ── Every metric reference must be in METRIC_RELEVANCE ──────────────────
  const checkMetricList = (location: string, items: ReadonlyArray<string>) => {
    for (const m of items) {
      if (!knownMetricKeys.has(m)) {
        issues.push({
          severity: "error",
          location,
          message: `References unknown metric_key: ${m}`,
        });
      }
    }
  };
  for (const f of FINGERPRINTS) {
    checkMetricList(`fingerprint[${f.key}].primary_metrics`, f.primary_metrics);
    checkMetricList(`fingerprint[${f.key}].secondary_metrics`, f.secondary_metrics);
    checkMetricList(`fingerprint[${f.key}].suppressible_metrics`, f.suppressible_metrics);
    checkMetricList(`fingerprint[${f.key}].durability_sensitive_metrics`, f.durability_sensitive_metrics);
    checkMetricList(`fingerprint[${f.key}].lender_sensitive_metrics`, f.lender_sensitive_metrics);
    checkMetricList(`fingerprint[${f.key}].uncertainty_sensitive_metrics`, f.uncertainty_sensitive_metrics);
  }

  // ── Every assumption reference must be in ASSUMPTIONS ───────────────────
  for (const f of FINGERPRINTS) {
    const unknownAssumptions = findUnknownAssumptionKeys(
      f.fragility_typical_dependencies as ReadonlyArray<string>,
    );
    for (const a of unknownAssumptions) {
      issues.push({
        severity: "error",
        location: `fingerprint[${f.key}].fragility_typical_dependencies`,
        message: `References unknown assumption_key: ${a}`,
      });
    }
  }

  // ── Trigger IDs must be unique across the registry ──────────────────────
  const seenTriggerIds = new Set<string>();
  for (const f of FINGERPRINTS) {
    for (const t of [...f.static_mismatch_triggers, ...f.trajectory_mismatch_triggers]) {
      if (seenTriggerIds.has(t.id)) {
        issues.push({
          severity: "error",
          location: `fingerprint[${f.key}].triggers[${t.id}]`,
          message: `Duplicate trigger ID: ${t.id}`,
        });
      }
      seenTriggerIds.add(t.id);
    }
  }

  // ── Uncertainty signal IDs must be unique ───────────────────────────────
  const seenSignalIds = new Set<string>();
  for (const f of FINGERPRINTS) {
    for (const s of f.structural_uncertainty_signals) {
      if (seenSignalIds.has(s.id)) {
        issues.push({
          severity: "error",
          location: `fingerprint[${f.key}].uncertainty_signals[${s.id}]`,
          message: `Duplicate signal ID: ${s.id}`,
        });
      }
      seenSignalIds.add(s.id);
    }
  }

  // ── Override industry_key/model_key must match INDUSTRY_TO_MODEL ───────
  for (const o of INDUSTRY_OVERRIDES) {
    if (!knownIndustryKeys.has(o.industry_key)) {
      issues.push({
        severity: "error",
        location: `override[${o.industry_key}]`,
        message: `Override references unknown industry_key`,
      });
      continue;
    }
    const expectedModel = INDUSTRY_TO_MODEL[o.industry_key];
    if (o.model_key !== expectedModel) {
      issues.push({
        severity: "error",
        location: `override[${o.industry_key}].model_key`,
        message: `Override declares model "${o.model_key}" but INDUSTRY_TO_MODEL says "${expectedModel}"`,
      });
    }
  }

  // ── No duplicate overrides ──────────────────────────────────────────────
  const seenOverrides = new Set<string>();
  for (const o of INDUSTRY_OVERRIDES) {
    if (seenOverrides.has(o.industry_key)) {
      issues.push({
        severity: "error",
        location: `override[${o.industry_key}]`,
        message: `Duplicate industry override`,
      });
    }
    seenOverrides.add(o.industry_key);
  }

  // ── Coverage check: every industry should have an override entry ────────
  for (const indKey of knownIndustryKeys) {
    if (!seenOverrides.has(indKey)) {
      issues.push({
        severity: "warning",
        location: `override[${indKey}]`,
        message: `No industry override entry — expected at least a placeholder declaring RMA metadata`,
      });
    }
  }

  // ── Aggregate counts ────────────────────────────────────────────────────
  const totalStatic = FINGERPRINTS.reduce((acc, f) => acc + f.static_mismatch_triggers.length, 0);
  const totalTraj = FINGERPRINTS.reduce((acc, f) => acc + f.trajectory_mismatch_triggers.length, 0);
  const totalSignals = FINGERPRINTS.reduce((acc, f) => acc + f.structural_uncertainty_signals.length, 0);
  const totalSources = FINGERPRINTS.reduce((acc, f) => acc + f.expected_source_standards.length, 0);
  const totalFailures = FINGERPRINTS.reduce((acc, f) => acc + f.expected_failure_modes.length, 0);

  const errors = issues.filter((i) => i.severity === "error").length;
  return {
    ok: errors === 0,
    issues,
    fingerprint_count: FINGERPRINTS.length,
    override_count: INDUSTRY_OVERRIDES.length,
    total_static_triggers: totalStatic,
    total_trajectory_triggers: totalTraj,
    total_uncertainty_signals: totalSignals,
    total_source_standards: totalSources,
    total_failure_modes: totalFailures,
    version: FINGERPRINT_REGISTRY_VERSION,
  };
}

function assertFingerprintRegistryValid(): void {
  const result = validateFingerprintRegistry();
  if (!result.ok) {
    const errorList = result.issues
      .filter((i) => i.severity === "error")
      .map((i) => `  [${i.location}] ${i.message}`)
      .join("\n");
    throw new Error(
      `Fingerprint registry validation failed (${FINGERPRINT_REGISTRY_VERSION}):\n${errorList}`,
    );
  }
}

// Fail-closed at load time.
assertFingerprintRegistryValid();
