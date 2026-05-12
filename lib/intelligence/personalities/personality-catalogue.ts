// lib/intelligence/personalities/personality-catalogue.ts
// ─────────────────────────────────────────────────────────────────────────────
// AcquiFlow Intelligence Engine — Lender Personality Catalogue
//
// CP-6 Module: Four declarative lender personality records.
//
// Each personality is a LenderPersonality data structure. No procedural
// code, no embedded scoring formulas, no per-personality classes. The
// CP-7 simulator reads these records and produces LenderPosture
// deterministically.
//
// Architectural commitments visible here:
//
//   1. Each personality declares an ordered axis_priority_order rather
//      than a weighted axis map. SBA reads "evidence first, then
//      financial"; seller_note reads "durability first, then fragility";
//      the inversion is structural, not numerical.
//
//   2. Each personality carries hybrid discomfort sources: structured
//      AxisDiscomfortPattern triggers (machine-readable for CP-7) plus
//      free-form prose (institutional psychology for CP-8 narrative).
//
//   3. Each discomfort source declares its repairability: repairable
//      discomforts can be closed by diligence/structure; fatal
//      discomforts are structural incompatibilities.
//
//   4. Comfort conditions are structurally distinct from deal-breakers
//      and information needs. Comfort conditions describe what closes
//      the institutional loop, not what disqualifies the deal.
//
//   5. Seller_note personality is the deliberate centerpiece. It is
//      the only personality where evidence_quality is NOT top-3 in
//      priority order. Its discomfort sources concentrate on transition
//      execution and customer transferability — the institutional lens
//      most systems miss entirely.
//
// Catalogue version: cp6-v0.1.0
// Per-personality versions: sba_lender@0.1.0, conventional_bank@0.1.0,
//   seller_note@0.1.0, cashflow_lender@0.1.0
//
// Editing any personality declaration requires:
//   1. Bumping that personality's version string
//   2. Governance review of the data diff
//   3. CP-9 snapshot persistence will preserve historical postures under
//      previous version strings
// ─────────────────────────────────────────────────────────────────────────────

import type {
  LenderPersonality,
} from "./types";
import { PERSONALITY_CATALOGUE_VERSION } from "./types";

// Re-export
export { PERSONALITY_CATALOGUE_VERSION };

// ─────────────────────────────────────────────────────────────────────────────
// PERSONALITY 1: SBA LENDER
// ─────────────────────────────────────────────────────────────────────────────
// The most common SMB acquisition financing personality. Documentation-
// strict, evidence-first, committee-defensible reasoning. Comfort
// closure is slow because every discomfort must be answered in writing
// before credit committee can sign off.

const SBA_LENDER: LenderPersonality = {
  id: "sba_lender",
  version: "0.1.0",
  display_name: "SBA 7(a) acquisition lender",
  archetype_label: "Conservative documentation-first institutional lender",
  profile_description:
    "SBA-guaranteed acquisition financing personality. Heavy reliance on documented " +
    "evidence, conservative coverage thresholds, owner-operator continuity assumptions, " +
    "and structural defensibility to credit committee. Most common SMB acquisition " +
    "financing source in the US market.",
  reasoning_style:
    "Hierarchical institutional reasoning: 'Do I trust the numbers? Does coverage " +
    "survive normalization? Is documentation sufficient for committee? Can I defend " +
    "the loan internally if questioned?' Each gate must clear in order.",

  // Evidence first — SBA cannot fund what cannot be documented
  axis_priority_order: [
    "evidence_quality",
    "financial_score",
    "underwriting_uncertainty",
    "durability_score",
    "assumption_fragility",
  ],

  deal_breakers: [
    {
      id: "sba.deal_breaker.verbal_assertion_only",
      name: "Verbal-assertion-only evidence base",
      trigger: { kind: "component_present", component_id: "component.evidence.verbal_assertion_only" },
      why_disqualifying:
        "SBA cannot underwrite deals with no documentary base. Without tax returns, bank " +
        "statements, or accounting export, the loan is fundamentally undocumentable to " +
        "credit committee — the file would fail SBA SOP review.",
    },
    {
      id: "sba.deal_breaker.evidence_concerning",
      name: "Evidence quality in 'concerning' band",
      trigger: { kind: "axis_band", axis: "evidence_quality", band: "concerning" },
      why_disqualifying:
        "Evidence in the concerning band means primary metrics rest on unverifiable sources. " +
        "SBA SOP requires verified-band evidence for the headline metrics; concerning-band " +
        "evidence triggers automatic decline regardless of other factors.",
    },
    {
      id: "sba.deal_breaker.fallback_fingerprint",
      name: "Fallback fingerprint used (industry not in registry)",
      trigger: { kind: "component_present", component_id: "component.uncertainty.fallback_fingerprint_used" },
      why_disqualifying:
        "When the engine resolves to a fallback fingerprint, no industry-specific operating " +
        "model is established. SBA underwriting requires industry-specific operating standards " +
        "(IBISWorld, RMA benchmarks) to support the file; fallback resolution breaks this.",
    },
    {
      id: "sba.deal_breaker.dscr_collapse",
      name: "Catastrophic coverage collapse",
      trigger: { kind: "component_present", component_id: "component.financial.catastrophic_coverage" },
      why_disqualifying:
        "Catastrophic DSCR signal means modeled coverage drops below survivability thresholds. " +
        "SBA SOP requires minimum 1.15x DSCR after standard normalization; catastrophic signals " +
        "indicate the loan cannot meet this floor under any reasonable interpretation.",
    },
  ],

  discomfort_sources: [
    {
      id: "sba.discomfort.unverifiable_adjustments",
      name: "Unverifiable adjustments",
      trigger: { kind: "component_present", component_id: "component.evidence.source_concerns_aggregate" },
      description: "SDE adjustments rest on seller-prepared schedules without tax-return anchoring.",
      why_uncomfortable:
        "SBA underwriting requires independently verifiable adjustments. When add-backs cannot " +
        "be traced to tax-return line items, the file becomes harder to defend in committee. " +
        "Reviewers will challenge each adjustment; the burden of proof sits with the lender.",
      repairability: "repairable",
      addresses_source_ids: [
        "component.evidence.source_concerns_aggregate",
        "component.evidence.deal_source_strength",
      ],
      asymmetry_profile: null,
    },
    {
      id: "sba.discomfort.weak_documentation",
      name: "Weak documentation across primary metrics",
      trigger: { kind: "axis_score_below", axis: "evidence_quality", threshold: 50 },
      description: "Evidence quality below moderate band indicates documentation gaps on multiple primary metrics.",
      why_uncomfortable:
        "SBA loans require committee defensibility. Documentation gaps create exam risk: when " +
        "the loan is reviewed by SBA examiners, gaps become findings, and findings become " +
        "lender repurchase risk. Conservative SBA lenders avoid loans that create exam exposure.",
      repairability: "repairable",
      addresses_source_ids: ["component.evidence.deal_source_strength"],
      asymmetry_profile: null,
    },
    {
      id: "sba.discomfort.covenant_thinness",
      name: "Thin coverage relative to standard floor",
      trigger: { kind: "axis_score_below", axis: "financial_score", threshold: 50 },
      description: "Financial axis below moderate band signals thin coverage and structural compression risk.",
      why_uncomfortable:
        "SBA wants comfortable buffer against normalization scenarios. Thin coverage means even " +
        "minor diligence findings (small addback failures, modest revenue normalization) push " +
        "the deal below SBA's minimum DSCR. The committee discussion becomes about whether the " +
        "buffer is real or arithmetic.",
      repairability: "repairable",
      addresses_source_ids: ["component.financial.coverage_signal"],
      asymmetry_profile: null,
    },
    {
      id: "sba.discomfort.customer_concentration",
      name: "Customer concentration on undocumented contracts",
      trigger: { kind: "component_present", component_id: "component.durability.customer_concentration" },
      description: "Top customer concentration without contract documentation.",
      why_uncomfortable:
        "When 20%+ of revenue depends on one customer, SBA underwriting wants documented " +
        "contracts with assignability provisions. Without those, post-close customer loss " +
        "becomes a known SBA-specific exit hazard.",
      repairability: "repairable",
      addresses_source_ids: ["component.durability.customer_concentration"],
      asymmetry_profile: null,
    },
    {
      id: "sba.discomfort.lender_stress_failure",
      name: "Failure of lender_stress scenario",
      trigger: {
        kind: "scenario_clearance",
        scenario_id: "scenario.stress.lender_stress",
        clears_at_worst: "fails",
      },
      description: "Lender stress scenario produces clearance failure.",
      why_uncomfortable:
        "The lender_stress scenario explicitly models conservative lender thresholds (1.75x " +
        "comfortable, 1.50x marginal, 1.30x compressed). When this scenario fails, the deal " +
        "cannot survive what SBA itself would model in its own underwriting. This is the most " +
        "structurally consequential discomfort for this personality.",
      repairability: "fatal",
      addresses_source_ids: ["scenario.stress.lender_stress"],
      asymmetry_profile: null,
    },
  ],

  required_comfort_conditions: [
    {
      id: "sba.comfort.tax_return_anchored_addbacks",
      name: "Tax-return-anchored adjustments",
      satisfied_when: { kind: "axis_score_above", axis: "evidence_quality", threshold: 60 },
      description: "Evidence quality at or above moderate band, indicating tax-return-anchored primary metrics.",
      why_needed:
        "SBA cannot reach interested posture without tax-return-anchored adjustments. This is the " +
        "structural minimum for committee defensibility.",
      required_for_interested: true,
    },
    {
      id: "sba.comfort.minimum_post_close_dscr",
      name: "Post-close DSCR at or above 1.30x baseline",
      satisfied_when: { kind: "axis_score_above", axis: "financial_score", threshold: 55 },
      description: "Financial axis above 55 indicates coverage holds at the SBA conservative threshold.",
      why_needed:
        "Below 1.30x post-close DSCR, the SBA file faces committee challenge. This personality needs " +
        "the coverage cushion to be visible, not arithmetic.",
      required_for_interested: true,
    },
    {
      id: "sba.comfort.top_customer_contract_visibility",
      name: "Top customer contract visibility",
      satisfied_when: { kind: "axis_score_above", axis: "durability_score", threshold: 50 },
      description: "Durability above cautionary band, indicating customer-retention assumption is supported.",
      why_needed:
        "When customer concentration is present, this personality needs to see contract assignability " +
        "or similar customer-relationship documentation to become comfortable.",
      required_for_interested: false,
    },
  ],

  information_needs: [
    {
      id: "sba.info.full_addback_schedule",
      name: "Complete add-back schedule",
      missing_when: { kind: "axis_score_above", axis: "underwriting_uncertainty", threshold: 50 },
      description: "Data uncertainty above moderate band indicates primary diligence inputs are missing.",
      why_needed:
        "SBA cannot form any posture without the full add-back schedule. This is upstream of all " +
        "other gates: even the deal-breakers cannot be evaluated until this information is provided.",
    },
  ],

  scenario_reading: [
    {
      scenario_id: "scenario.stress.lender_stress",
      weight: "primary",
      why_relevant: "Models SBA's own underwriting thresholds. Primary posture-determining scenario.",
    },
    {
      scenario_id: "scenario.normalization.addback_partial_recovery",
      weight: "primary",
      why_relevant: "Tests deal survival under conservative addback diligence — the central SBA concern.",
    },
    {
      scenario_id: "scenario.normalization.owner_replacement_normalized",
      weight: "supporting",
      why_relevant: "SBA underwriting models owner-replacement viability for absentee owner cases.",
    },
    {
      scenario_id: "scenario.normalization.industry_normalized",
      weight: "supporting",
      why_relevant: "Tests defensibility against industry-median baseline.",
    },
  ],

  comfort_velocity: "slow",

  attractive_signals_summary:
    "Tax-return-anchored adjustments. Comfortable DSCR cushion (1.50x+) under lender_stress. " +
    "Documented owner-replacement viability. Top customer contracts visible and assignable. " +
    "Industry-specific operating model with established RMA benchmarks. Five years of clean " +
    "tax filings.",

  structural_incompatibilities_summary:
    "Verbal-assertion-only evidence base. Fallback fingerprint resolution. Catastrophic " +
    "coverage signals. Concerning-band evidence quality. Industries without SBA-eligible " +
    "operating models (specific NAICS exclusions apply).",
};

// ─────────────────────────────────────────────────────────────────────────────
// PERSONALITY 2: CONVENTIONAL BANK
// ─────────────────────────────────────────────────────────────────────────────
// Coverage-focused, collateral-aware, durability-conscious. Tolerates
// lower growth if collateral is strong. Less prescriptive than SBA but
// more conservative on cyclicality and working-capital instability.

const CONVENTIONAL_BANK: LenderPersonality = {
  id: "conventional_bank",
  version: "0.1.0",
  display_name: "Conventional commercial bank",
  archetype_label: "Coverage + collateral focused commercial bank",
  profile_description:
    "Conventional acquisition financing from a regional or community commercial bank. " +
    "Coverage-focused with collateral support, durability-aware, structurally " +
    "conservative on cyclicality. Less documentation-rigid than SBA but more focused " +
    "on through-cycle survivability.",
  reasoning_style:
    "Coverage-first reasoning followed by collateral assessment: 'Does cash flow service " +
    "the loan comfortably? If cash flow compresses, what collateral supports the loan? " +
    "Does the business survive a normal cycle downturn?'",

  axis_priority_order: [
    "financial_score",
    "durability_score",
    "evidence_quality",
    "underwriting_uncertainty",
    "assumption_fragility",
  ],

  deal_breakers: [
    {
      id: "bank.deal_breaker.catastrophic_coverage",
      name: "Catastrophic coverage signal",
      trigger: { kind: "component_present", component_id: "component.financial.catastrophic_coverage" },
      why_disqualifying:
        "Cash-flow service is the foundation of bank acquisition financing. When the catastrophic " +
        "coverage component fires, the loan cannot be supported by operating cash flow under any " +
        "reasonable model. This is structurally disqualifying regardless of collateral.",
    },
    {
      id: "bank.deal_breaker.durability_concerning",
      name: "Durability in concerning band",
      trigger: { kind: "axis_band", axis: "durability_score", band: "concerning" },
      why_disqualifying:
        "When durability is concerning, the deal carries unacceptable through-cycle risk. " +
        "Banks underwrite to survive normal downturns; deals that cannot are not loanable on " +
        "conventional terms.",
    },
  ],

  discomfort_sources: [
    {
      id: "bank.discomfort.collateral_insufficiency",
      name: "Asset-light deal with thin coverage",
      trigger: { kind: "axis_score_below", axis: "financial_score", threshold: 50 },
      description: "Financial axis below moderate when the operating model is asset-light reduces fallback collateral support.",
      why_uncomfortable:
        "Banks rely on collateral as fallback when cash flow stresses. Asset-light deals (service " +
        "businesses, professional practices) provide little collateral support, making thin coverage " +
        "structurally less tolerable than for asset-heavy deals.",
      repairability: "fatal",
      addresses_source_ids: ["component.financial.coverage_signal"],
      asymmetry_profile: null,
    },
    {
      id: "bank.discomfort.structural_cyclicality",
      name: "Cyclical revenue trajectory",
      trigger: { kind: "component_present", component_id: "component.durability.trajectory_durability" },
      description: "Revenue trajectory signals cyclicality or sustained decline.",
      why_uncomfortable:
        "Conventional banks underwrite to survive cycles. When revenue trajectory shows decline or " +
        "volatility consistent with cyclical exposure, the bank wants explicit cycle-survival " +
        "evidence (prior-cycle financials, recession-period coverage analysis).",
      repairability: "repairable",
      addresses_source_ids: ["component.durability.trajectory_durability"],
      asymmetry_profile: null,
    },
    {
      id: "bank.discomfort.working_capital_instability",
      name: "Working capital pressure or absorption",
      trigger: { kind: "component_present", component_id: "component.durability.working_capital_durability" },
      description: "Working capital signals indicating compression, absorption, or instability.",
      why_uncomfortable:
        "Banks structure deals around working-capital lines of credit and seasonal facilities. " +
        "When working capital is unstable, the structure becomes harder to size correctly, and " +
        "post-close cash crunches require facility increases the bank wants visible upfront.",
      repairability: "repairable",
      addresses_source_ids: ["component.durability.working_capital_durability"],
      asymmetry_profile: null,
    },
    {
      id: "bank.discomfort.lender_stress_failure",
      name: "Failure of lender_stress scenario",
      trigger: {
        kind: "scenario_clearance",
        scenario_id: "scenario.stress.lender_stress",
        clears_at_worst: "fails",
      },
      description: "Lender stress scenario produces clearance failure.",
      why_uncomfortable:
        "While the conventional bank uses softer thresholds than SBA, scenario failure under " +
        "lender_stress indicates the deal does not survive what most institutional lenders model. " +
        "Even when the bank uses asset-based fallbacks, this scenario failure pushes the structure " +
        "toward asset-backed lending rather than cash-flow lending.",
      repairability: "fatal",
      addresses_source_ids: ["scenario.stress.lender_stress"],
      asymmetry_profile: null,
    },
  ],

  required_comfort_conditions: [
    {
      id: "bank.comfort.coverage_cushion",
      name: "Coverage cushion above conservative threshold",
      satisfied_when: { kind: "axis_score_above", axis: "financial_score", threshold: 55 },
      description: "Financial axis above 55 indicates coverage holds with margin against scenario compression.",
      why_needed:
        "Banks need explicit coverage cushion above the conservative threshold to feel comfortable " +
        "writing the loan. Marginal coverage forces the structure into a debt-service-reserve.",
      required_for_interested: true,
    },
    {
      id: "bank.comfort.working_capital_stability",
      name: "Working capital stability evidence",
      satisfied_when: { kind: "axis_score_above", axis: "durability_score", threshold: 55 },
      description: "Durability above 55 indicates working capital and operating structure are stable.",
      why_needed:
        "Conventional bank structures need stable working capital to size facilities correctly. " +
        "Without this, the deal moves to asset-based lending with different economics.",
      required_for_interested: false,
    },
  ],

  information_needs: [
    {
      id: "bank.info.balance_sheet_history",
      name: "Multi-year balance sheet history",
      missing_when: { kind: "axis_score_above", axis: "underwriting_uncertainty", threshold: 50 },
      description: "Uncertainty above moderate band indicates missing balance-sheet history.",
      why_needed:
        "Banks need multi-year balance sheets to assess working-capital cyclicality and asset " +
        "structure. Missing balance-sheet history prevents proper collateral sizing.",
    },
  ],

  scenario_reading: [
    {
      scenario_id: "scenario.stress.lender_stress",
      weight: "primary",
      why_relevant: "Most institutional lender stress; banks use similar thresholds.",
    },
    {
      scenario_id: "scenario.stress.working_capital_compressed",
      weight: "primary",
      why_relevant: "Banks underwrite to working-capital cycle; this scenario tests through-cycle viability.",
    },
    {
      scenario_id: "scenario.stress.revenue_compression",
      weight: "supporting",
      why_relevant: "Tests cyclical resilience; central bank concern.",
    },
    {
      scenario_id: "scenario.normalization.capex_normalized",
      weight: "supporting",
      why_relevant: "Banks look at true maintenance capex for asset-heavy deals.",
    },
  ],

  comfort_velocity: "moderate",

  attractive_signals_summary:
    "Strong coverage with collateral support. Stable working capital. Through-cycle revenue " +
    "history available. Asset-heavy operating model with tangible collateral. Customer base " +
    "diversified. Conventional growth profile without cyclical exposure.",

  structural_incompatibilities_summary:
    "Catastrophic coverage signals. Concerning durability. Cyclical industries with no " +
    "demonstrated cycle survival. Asset-light deals with thin coverage. Working-capital " +
    "instability that prevents proper facility sizing.",
};

// ─────────────────────────────────────────────────────────────────────────────
// PERSONALITY 3: SELLER NOTE (the centerpiece)
// ─────────────────────────────────────────────────────────────────────────────
// The hidden gem. Sits between operator psychology and institutional
// underwriting. Most SMB deals actually clear because seller confidence
// bridges fragility. This personality reads the deal through the lens
// of "Can this survive ownership transfer?" — the underwriting ontology
// most systems completely miss.

const SELLER_NOTE: LenderPersonality = {
  id: "seller_note",
  version: "0.1.0",
  display_name: "Seller note / independent sponsor financing",
  archetype_label: "Transition-execution-focused operator-aware financing",
  profile_description:
    "Seller financing personality covering seller notes, earn-outs, and independent " +
    "sponsor structures. The institutional lens most systems miss: the seller already " +
    "possesses the underlying documentary evidence. Comfort closure is driven not by " +
    "documentation rigor but by survivability after ownership transfer.",
  reasoning_style:
    "Transition-first reasoning: 'Can this business survive me leaving? Are the customer " +
    "relationships transferable? Does the buyer have the operational capability? Is the " +
    "fragility manageable post-transition?' The seller already trusts the documentation; " +
    "they need to trust the transition.",

  // The deliberate inversion: evidence_quality is dead last. Durability and
  // fragility lead. This is the structural distinction that makes seller
  // financing institutionally different from bank financing.
  axis_priority_order: [
    "durability_score",
    "assumption_fragility",
    "underwriting_uncertainty",
    "financial_score",
    "evidence_quality",
  ],

  deal_breakers: [
    {
      id: "seller.deal_breaker.universal_scenario_failure",
      name: "Universal scenario failure",
      trigger: {
        kind: "component_present",
        component_id: "component.durability.catastrophic_scenario",
      },
      why_disqualifying:
        "Even with seller financing flexibility, when every applied scenario fails clearance, " +
        "the deal cannot survive any reasonable interpretation. Seller financing tolerates " +
        "fragility but cannot finance a business that breaks under every stress condition.",
    },
    {
      id: "seller.deal_breaker.catastrophic_coverage",
      name: "Catastrophic coverage collapse",
      trigger: { kind: "component_present", component_id: "component.financial.catastrophic_coverage" },
      why_disqualifying:
        "Seller financing can absorb modest coverage compression through earn-out structures or " +
        "deferred payments, but catastrophic DSCR collapse means there is no path to service the " +
        "note. This is the one financial-axis condition seller financing cannot work around.",
    },
  ],

  // Discomfort sources concentrate on transition risk and operator dependency
  // — exactly the institutional lens that distinguishes seller financing.
  discomfort_sources: [
    {
      id: "seller.discomfort.transition_fragility",
      name: "Transition fragility signals",
      trigger: {
        kind: "component_present",
        component_id: "component.durability.transition_fragility",
      },
      description: "Operating-model mismatch, sole-proprietor signals, or other transition-risk markers.",
      why_uncomfortable:
        "Seller financing depends on the business surviving ownership transfer. When transition " +
        "fragility signals fire, the seller carries unsecured exposure to a transition that may " +
        "not work. The seller's note is junior to the buyer's senior debt; if the business stumbles " +
        "post-close, the seller's payment is at risk before the buyer's.",
      repairability: "repairable",
      addresses_source_ids: ["component.durability.transition_fragility"],
      asymmetry_profile: null,
    },
    {
      id: "seller.discomfort.customer_transferability",
      name: "Customer transferability uncertainty",
      trigger: {
        kind: "component_present",
        component_id: "component.durability.customer_concentration",
      },
      description: "Customer concentration without demonstrated transferability.",
      why_uncomfortable:
        "When customer concentration is present, the seller's note depends on those customers " +
        "transferring to the buyer. The seller knows whether the relationships are personal " +
        "(non-transferable) or institutional (transferable). When concentration signals fire, the " +
        "seller needs the buyer to demonstrate the customer transition plan before the structure " +
        "becomes comfortable.",
      repairability: "repairable",
      addresses_source_ids: ["component.durability.customer_concentration"],
      asymmetry_profile: null,
    },
    {
      id: "seller.discomfort.operator_dependency",
      name: "Operator dependency signal",
      trigger: { kind: "component_present", component_id: "component.financial.margin_signal" },
      description: "Elevated SDE margin in service-heavy operating model — sole-proprietor signal.",
      why_uncomfortable:
        "When elevated SDE margin in a service model fires, the business may be carrying significant " +
        "operator-dependent economics. The seller knows what they personally contribute to the operation; " +
        "if that contribution is structural rather than discretionary, the buyer inherits an operator-" +
        "dependency the seller cannot replace.",
      repairability: "repairable",
      addresses_source_ids: ["component.financial.margin_signal"],
      asymmetry_profile: null,
    },
    {
      id: "seller.discomfort.fragility_hotspots",
      name: "Multiple fragility hotspots concentrated",
      trigger: { kind: "fragility_hotspot_concentration", min_hotspot_count: 4 },
      description: "Four or more fragility hotspots on the same assumption surface.",
      why_uncomfortable:
        "Seller financing tolerates fragility better than bank financing, but when fragility " +
        "hotspots concentrate on multiple assumptions simultaneously, the seller cannot personally " +
        "guarantee all of them. Multiple hotspots mean multiple ways the post-close business could " +
        "deviate from current operations — and the seller's note has no senior security to fall back on.",
      repairability: "fatal",
      addresses_source_ids: ["component.fragility.hotspot_concentration"],
      asymmetry_profile: null,
    },
    {
      id: "seller.discomfort.partner_departure_failure",
      name: "Partner-departure scenario failure",
      trigger: {
        kind: "scenario_clearance",
        scenario_id: "scenario.stress.buyer_downside_partner_departure",
        clears_at_worst: "fails",
      },
      description: "Partner-departure or key-person scenario fails.",
      why_uncomfortable:
        "In professional services and healthcare practice deals, partner/key-person departure is " +
        "the central transition risk. When this scenario fails, the deal cannot survive the loss " +
        "of the seller's personal relationships — exactly the scenario seller financing must " +
        "survive to be repaid.",
      repairability: "repairable",
      addresses_source_ids: ["scenario.stress.buyer_downside_partner_departure"],
      asymmetry_profile: null,
    },
  ],

  // Comfort conditions focus on transition mechanics, not documentation
  required_comfort_conditions: [
    {
      id: "seller.comfort.transition_durability",
      name: "Transition-survivable durability",
      satisfied_when: { kind: "axis_score_above", axis: "durability_score", threshold: 50 },
      description: "Durability above cautionary band indicates the business is structured to survive transition.",
      why_needed:
        "Seller financing fundamentally requires the business to survive ownership transfer. " +
        "Durability below this threshold means the transition risk is structurally elevated.",
      required_for_interested: true,
    },
    {
      id: "seller.comfort.manageable_fragility",
      name: "Fragility within manageable bounds",
      satisfied_when: { kind: "axis_score_below", axis: "assumption_fragility", threshold: 75 },
      description: "Fragility below highly_concentrated indicates dependencies are manageable post-transition.",
      why_needed:
        "Seller financing tolerates moderate fragility, but highly_concentrated fragility means too " +
        "many simultaneous post-close dependencies. The seller needs to see manageable structure " +
        "before underwriting the note.",
      required_for_interested: true,
    },
    {
      id: "seller.comfort.coverage_minimum_for_seller_payment",
      name: "Coverage sufficient for seller-note service",
      satisfied_when: { kind: "axis_score_above", axis: "financial_score", threshold: 45 },
      description: "Financial axis above cautionary band indicates cash flow can service both senior and seller note.",
      why_needed:
        "Seller financing is subordinate to senior debt. The seller needs to see enough cash-flow " +
        "cushion that the seller-note payments don't compete with senior service in months 12-24 " +
        "post-close.",
      required_for_interested: false,
    },
  ],

  // Information needs are deliberately minimal — the seller already
  // possesses the underlying documentary evidence.
  information_needs: [
    {
      id: "seller.info.buyer_operational_capability",
      name: "Buyer operational capability assessment",
      missing_when: { kind: "axis_score_above", axis: "underwriting_uncertainty", threshold: 60 },
      description: "Underwriting uncertainty above elevated band suggests buyer capability cannot be assessed.",
      why_needed:
        "Seller financing fundamentally depends on the buyer being able to operate the business. " +
        "This is the only information need; everything else the seller can resolve through personal " +
        "knowledge of the operation.",
    },
  ],

  scenario_reading: [
    {
      scenario_id: "scenario.stress.buyer_downside_top_customer_loss",
      weight: "primary",
      why_relevant: "Customer transfer failure is the seller's central post-close risk.",
    },
    {
      scenario_id: "scenario.stress.buyer_downside_partner_departure",
      weight: "primary",
      why_relevant: "Key-person/partner transition is the seller-financing-specific risk.",
    },
    {
      scenario_id: "scenario.normalization.owner_replacement_normalized",
      weight: "primary",
      why_relevant: "Tests whether the business carries operator-dependent economics that affect the seller's payment.",
    },
    {
      scenario_id: "scenario.stress.revenue_compression",
      weight: "supporting",
      why_relevant: "Revenue compression affects junior-debt service before senior.",
    },
  ],

  comfort_velocity: "fast",

  attractive_signals_summary:
    "Customer transferability evident. Durable operating model independent of operator. Manageable " +
    "fragility with verifiable assumptions. Buyer with credible operational background. Earn-out " +
    "alignment incentives present. Transition plan documented. Multi-year customer relationships " +
    "with institutional rather than personal ties.",

  structural_incompatibilities_summary:
    "Universal scenario failure. Catastrophic coverage collapse. Highly-concentrated fragility " +
    "across multiple assumptions. Partner-departure scenario failure in professional-services " +
    "deals. Customer concentration on personal (non-transferable) relationships.",
};

// ─────────────────────────────────────────────────────────────────────────────
// PERSONALITY 4: CASH-FLOW LENDER
// ─────────────────────────────────────────────────────────────────────────────
// Mezzanine, unitranche, cash-flow-focused private credit. Higher
// leverage tolerance when cash flow is durable; less prescriptive on
// evidence than SBA; intolerant of margin volatility or scenario
// compression because the structure relies on cash flow not collateral.

const CASHFLOW_LENDER: LenderPersonality = {
  id: "cashflow_lender",
  version: "0.1.0",
  display_name: "Cash-flow lender (mezzanine / unitranche)",
  archetype_label: "Cash-flow-focused private credit",
  profile_description:
    "Private credit personality covering mezzanine, unitranche, and cash-flow lending. " +
    "Higher leverage appetite when cash flow durability is demonstrated. More tolerant " +
    "of evidence imperfection than SBA but structurally intolerant of margin volatility " +
    "or recurring revenue instability — the structure depends on durable cash flow.",
  reasoning_style:
    "Cash-flow-durability first: 'Is the cash flow durable through normal cycles? Are " +
    "margins stable enough to support the structure? Does business quality compensate for " +
    "evidence imperfection?' Less weight on documentation, more on operational durability.",

  axis_priority_order: [
    "durability_score",
    "financial_score",
    "underwriting_uncertainty",
    "assumption_fragility",
    "evidence_quality",
  ],

  deal_breakers: [
    {
      id: "cashflow.deal_breaker.durability_concerning",
      name: "Durability in concerning band",
      trigger: { kind: "axis_band", axis: "durability_score", band: "concerning" },
      why_disqualifying:
        "Cash-flow lending is fundamentally a bet on durable cash flow. When durability is concerning, " +
        "the entire structure thesis breaks down. No leverage rationalizes a concerning-durability deal " +
        "for this personality.",
    },
    {
      id: "cashflow.deal_breaker.catastrophic_coverage",
      name: "Catastrophic coverage collapse",
      trigger: { kind: "component_present", component_id: "component.financial.catastrophic_coverage" },
      why_disqualifying:
        "Catastrophic coverage means cash flow cannot support the structure at any leverage level. " +
        "Cash-flow lenders cannot solve this with structure changes — the underlying earnings are " +
        "insufficient.",
    },
  ],

  discomfort_sources: [
    {
      id: "cashflow.discomfort.margin_volatility",
      name: "Margin volatility or expansion concerns",
      trigger: { kind: "component_present", component_id: "component.financial.trajectory_signal" },
      description: "Multi-year margin trajectory shows volatility or rapid expansion patterns.",
      why_uncomfortable:
        "Cash-flow structures price for durable margins. Volatile or recently-expanded margins create " +
        "exit-pricing risk: when the lender refinances or sells the position, margin compression " +
        "depresses the exit valuation. The structure works at current margins but is fragile to " +
        "margin reversion.",
      repairability: "repairable",
      addresses_source_ids: ["component.financial.trajectory_signal"],
      asymmetry_profile: null,
    },
    {
      id: "cashflow.discomfort.scenario_compression",
      name: "Scenario clearance compression",
      trigger: { kind: "component_present", component_id: "component.durability.scenario_clearance" },
      description: "Scenario clearance posture shows material compression across applied scenarios.",
      why_uncomfortable:
        "Cash-flow lenders price for through-cycle survivability, not just point-in-time coverage. " +
        "When applied scenarios show concentrated compression, the structure's safety margin is " +
        "thinner than headline metrics suggest. This personality is more sensitive to scenario " +
        "compression than to evidence imperfection.",
      repairability: "fatal",
      addresses_source_ids: ["component.durability.scenario_clearance"],
      asymmetry_profile: null,
    },
    {
      id: "cashflow.discomfort.fragility_concentration",
      name: "Fragility hotspot concentration on cash-flow assumptions",
      trigger: { kind: "axis_band", axis: "assumption_fragility", band: "highly_concentrated" },
      description: "Fragility in highly_concentrated band — multiple critical assumptions concentrate.",
      why_uncomfortable:
        "When fragility is highly concentrated, multiple cash-flow-relevant assumptions could fail " +
        "simultaneously. Cash-flow lending tolerates moderate fragility but not concentrated " +
        "fragility on the assumptions that drive earnings.",
      repairability: "repairable",
      addresses_source_ids: ["component.fragility.hotspot_concentration"],
      asymmetry_profile: null,
    },
    {
      id: "cashflow.discomfort.industry_normalized_failure",
      name: "Industry normalization failure",
      trigger: {
        kind: "scenario_clearance",
        scenario_id: "scenario.normalization.industry_normalized",
        clears_at_worst: "fails",
      },
      description: "Industry-normalized scenario fails clearance.",
      why_uncomfortable:
        "When industry-normalized earnings fail clearance, the deal's headline margins may be carrying " +
        "non-durable economics. Cash-flow lenders price for industry-typical economics; deals that " +
        "fail when normalized to industry medians are structurally over-priced relative to durable " +
        "cash flow.",
      repairability: "repairable",
      addresses_source_ids: ["scenario.normalization.industry_normalized"],
      asymmetry_profile: null,
    },
  ],

  required_comfort_conditions: [
    {
      id: "cashflow.comfort.durable_cash_flow",
      name: "Durable cash flow profile",
      satisfied_when: { kind: "axis_score_above", axis: "durability_score", threshold: 55 },
      description: "Durability above moderate band indicates cash-flow profile is structurally durable.",
      why_needed:
        "Cash-flow lending requires durability to support leverage. Below this threshold the " +
        "structure cannot be priced.",
      required_for_interested: true,
    },
    {
      id: "cashflow.comfort.coverage_with_normalization_buffer",
      name: "Coverage cushion against normalization",
      satisfied_when: { kind: "axis_score_above", axis: "financial_score", threshold: 55 },
      description: "Financial axis above moderate band indicates coverage holds with normalization buffer.",
      why_needed:
        "Cash-flow lenders price for through-cycle coverage. Need explicit buffer against " +
        "industry-median normalization.",
      required_for_interested: true,
    },
  ],

  information_needs: [
    {
      id: "cashflow.info.multi_year_margin_trajectory",
      name: "Multi-year margin trajectory",
      missing_when: { kind: "axis_score_above", axis: "underwriting_uncertainty", threshold: 55 },
      description: "Uncertainty above moderate band indicates multi-year trajectory is unavailable.",
      why_needed:
        "Cash-flow lenders need to see whether current margins reflect durable economics or " +
        "recent expansion. Multi-year trajectory is the central evidence for this assessment.",
    },
  ],

  scenario_reading: [
    {
      scenario_id: "scenario.normalization.industry_normalized",
      weight: "primary",
      why_relevant: "Tests durability against industry-typical economics — central cash-flow assessment.",
    },
    {
      scenario_id: "scenario.stress.revenue_compression",
      weight: "primary",
      why_relevant: "Tests through-cycle resilience — cash-flow structure's central concern.",
    },
    {
      scenario_id: "scenario.normalization.churn_normalized",
      weight: "supporting",
      why_relevant: "For recurring-revenue deals, tests retention assumptions central to durable cash flow.",
    },
    {
      scenario_id: "scenario.stress.lender_stress",
      weight: "supporting",
      why_relevant: "Tests under stricter lender thresholds even though personality uses softer thresholds itself.",
    },
  ],

  comfort_velocity: "moderate",

  attractive_signals_summary:
    "Durable through-cycle margins. Industry-normalized clearance comfortable or marginal. " +
    "Recurring revenue persistence demonstrated. Multi-year trajectory showing stability. Cash-flow " +
    "model resilient to industry-typical compression. Business quality compensates for documentation " +
    "imperfection.",

  structural_incompatibilities_summary:
    "Concerning durability. Catastrophic coverage. Highly-concentrated fragility on cash-flow " +
    "assumptions. Industry-normalized scenario failure (signals headline margins are non-durable). " +
    "Margin volatility without explained structural drivers.",
};

// ─────────────────────────────────────────────────────────────────────────────
// THE CATALOGUE
// ─────────────────────────────────────────────────────────────────────────────

export const PERSONALITY_CATALOGUE: ReadonlyArray<LenderPersonality> = [
  SBA_LENDER,
  CONVENTIONAL_BANK,
  SELLER_NOTE,
  CASHFLOW_LENDER,
];
