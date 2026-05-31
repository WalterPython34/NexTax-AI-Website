// lib/intelligence/tax/tax-types.ts
// ═════════════════════════════════════════════════════════════════════════════
// AcquiFlow — Tax Layer, Phase Tax-2 LAYER 1: TYPES + CATEGORICAL CATALOG (data)
//
// This module is TYPES AND DATA ONLY. No calculator logic, no SQL, no UI.
// It encodes:
//   - tax canonical fact shape (logically canonical; physical placement = a 1:1
//     canonical_tax_facts table per Phase Tax-1 Refinement 1, decided in a later layer)
//   - tax scenario assumption shape
//   - the closed sets: consequence ids, domains, buckets
//   - required-input maps per consequence
//   - forbidden tax write fields (Bucket C + the never-write list)
//   - the categorical-statement catalog as DATA (exact emitted text + exact
//     not-computable reason text + provenance field names), transcribed from
//     TAX-CATEGORICAL-STATEMENTS.md with Steve's four approved revisions.
//
// The statement text lives here as data, not as logic, so Phase Tax-2 Layer 3
// (the calculator) can be a pure lookup+substitution against this catalog, and so
// the constitutional validators can scan the text without executing any compute.
// ═════════════════════════════════════════════════════════════════════════════

export const TAX_LAYER_VERSION = "tax-types-v1.0.0";

// ─────────────────────────────────────────────────────────────────────────────
// CLOSED ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export type TargetEntityType =
  | "c_corp" | "s_corp" | "llc_partnership" | "llc_disregarded" | "sole_prop" | "unknown";

export type DealStructure =
  | "asset" | "stock" | "stock_with_338_h_10" | "stock_with_336_e" | "unspecified";

export type EquipmentClass = "5yr" | "7yr" | "unspecified";
export type RealPropertyClass = "nonresidential_39yr" | "residential_27_5yr" | "unspecified";

// Tax consequence domains (extend the acquisition ConsequenceDomain set).
export type TaxConsequenceDomain =
  | "tax_structural_treatment"
  | "tax_amortization_depreciation"
  | "tax_basis_recovery";

export const TAX_DOMAIN_ORDER = [
  "tax_structural_treatment",
  "tax_amortization_depreciation",
  "tax_basis_recovery",
] as const satisfies readonly TaxConsequenceDomain[];

// Bucket classification. A is deterministic-given-inputs; B requires explicit
// user rate/allocation inputs; C is OUT OF SCOPE for MVP (must never be emitted).
export type TaxBucket = "A" | "B" | "C";

// ── consequence ids (closed set). Bucket A + the single Bucket B categorical +
//    the two Bucket B arithmetic schedules. NO Bucket C id appears here. ──
export type TaxConsequenceId =
  // Bucket A — categorical
  | "tax.structural_difference_asset_vs_stock"
  | "tax.election_effect_338_h_10"
  | "tax.election_effect_336_e"
  | "tax.nol_carryover_categorical"
  | "tax.character_1245_recapture"
  | "tax.character_1250_recapture"
  | "tax.seller_note_interest_characterization"
  | "tax.basis_step_up_mechanics"
  | "tax.remaining_tax_basis_by_class"
  // Bucket A — arithmetic schedules (no rate inputs)
  | "tax.sec197_amortization_schedule"
  | "tax.macrs_recovery_schedule_equipment"
  | "tax.macrs_recovery_schedule_real_property"
  | "tax.total_basis_recovery_schedule"
  // Bucket B — arithmetic tax-shield (rate inputs) + one categorical
  | "tax.annual_197_tax_shield"
  | "tax.annual_macrs_tax_shield_equipment"
  | "tax.seller_character_split_categorical";

// ─────────────────────────────────────────────────────────────────────────────
// INPUT SHAPES
// ─────────────────────────────────────────────────────────────────────────────

/** Logically-canonical tax facts. Physical placement (extension table) decided
 *  in a later layer; immutable, never written from the Tax tab. */
export interface TaxCanonicalFacts {
  target_entity_type: TargetEntityType;
  state_of_organization: string | null;
  states_of_operation: string[];
  foreign_operations_present: boolean | null;
  disclosed_nols_present: boolean | null;
  disclosed_nol_amount: number | null;
  // accelerated_depreciation_present + recapture_sensitive_classes_present already
  // exist on the acquisition canonical record; re-declared here for the tax calc's
  // input view (the calculator reads them, does not own them).
  accelerated_depreciation_present: number | null;
  recapture_sensitive_classes_present: boolean | null;
  existing_tax_basis_disclosed: boolean | null;
  existing_tax_basis_by_class: {
    goodwill?: number; equipment?: number; real_property?: number;
    other_intangibles?: number; working_capital?: number;
  } | null;
}

/** Tax scenario assumptions. Interpretive, branchable, user-owned. Rates are
 *  ALWAYS nullable and NEVER defaulted. */
export interface TaxScenarioAssumptions {
  deal_structure: DealStructure;
  ppa_goodwill: number | null;
  ppa_equipment: number | null;
  ppa_equipment_class: EquipmentClass;
  ppa_real_property: number | null;
  ppa_real_property_class: RealPropertyClass;
  ppa_other_intangibles: number | null;
  ppa_working_capital: number | null;
  buyer_ordinary_rate: number | null;
  buyer_capital_rate: number | null;
  seller_ordinary_rate: number | null;
  seller_capital_rate: number | null;
  // working_capital_requirement + seller_note already exist on the scenario.
}

// The four rate fields — enumerated so validators can prove none is ever defaulted.
export const TAX_RATE_FIELDS = [
  "buyer_ordinary_rate", "buyer_capital_rate", "seller_ordinary_rate", "seller_capital_rate",
] as const;
export type TaxRateField = typeof TAX_RATE_FIELDS[number];

// ─────────────────────────────────────────────────────────────────────────────
// FORBIDDEN WRITE FIELDS — the save-path (a later layer) rejects any patch that
// writes these. Enumerated here, version-pinned. Two categories:
//   (1) Bucket C concept fields that must never exist as writable scenario state
//   (2) canonical tax facts that must never be written from a scenario surface
// ─────────────────────────────────────────────────────────────────────────────
export const FORBIDDEN_SCENARIO_WRITE_FIELDS = [
  // Bucket C concepts — never writable scenario fields in MVP
  "discount_rate", "npv_of_deductions", "state_tax_rate", "state_tax_estimate",
  "apportionment_factor", "total_buyer_tax", "total_seller_tax", "total_tax_liability",
  "sec382_limitation", "built_in_gain", "gilti", "fdii", "beat", "ftc_utilization",
  "blended_rate", "amount_realized", "total_recognized_gain",
] as const;

// Canonical tax facts must never be written from a scenario patch.
export const CANONICAL_TAX_FACT_FIELDS = [
  "target_entity_type", "state_of_organization", "states_of_operation",
  "foreign_operations_present", "disclosed_nols_present", "disclosed_nol_amount",
  "existing_tax_basis_disclosed", "existing_tax_basis_by_class",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORICAL STATEMENT CATALOG — DATA, transcribed from TAX-CATEGORICAL-STATEMENTS.md
//
// Each entry is a pure data record. The calculator (later layer) selects an
// emitted-text variant by a key derived from inputs; it does not author text.
// `not_computable_reasons` maps a missing-input key to its exact reason string.
// `provenance_fields` lists the input_values_used names (with source) the
// calculator must attach when the statement is emitted.
// ─────────────────────────────────────────────────────────────────────────────

export type ProvenanceSource = "canonical_market_truth" | "scenario_assumption";

export interface CategoricalStatementSpec {
  consequence_id: TaxConsequenceId;
  domain: TaxConsequenceDomain;
  bucket: TaxBucket;
  // required input field names (any namespace); validator asserts non-empty
  required_inputs: string[];
  // emitted text: either a single string, or a map keyed by a selector value
  emitted_text: string | Record<string, string>;
  // exact not-computable reason strings, keyed by the missing-input condition
  not_computable_reasons: Record<string, string>;
  // provenance field names + their source, attached on emission
  provenance_fields: { name: string; source: ProvenanceSource }[];
  // when true, the consequence is simply absent (not a not-computable row) if a
  // categorical precondition fails (e.g. NOL carryover in an asset deal)
  non_emission_when_inapplicable: boolean;
  // marks statements whose exact wording is flagged "review before production"
  review_before_production?: boolean;
}

// The catalog. Bucket A categorical + the single Bucket B categorical.
// Arithmetic consequences (schedules, tax shields) are NOT in this catalog —
// they are computed, not stated, and live in the calculator layer.
export const TAX_CATEGORICAL_CATALOG: CategoricalStatementSpec[] = [
  {
    consequence_id: "tax.structural_difference_asset_vs_stock",
    domain: "tax_structural_treatment", bucket: "A",
    required_inputs: ["deal_structure", "target_entity_type"],
    emitted_text: {
      asset: "An asset acquisition generally establishes a new tax basis in the acquired assets equal to the purchase price as allocated. Buyer deductions arising from §197 amortization and §168 depreciation follow the allocated basis. Net operating losses and tax attributes remain with the historical entity and do not generally transfer with the assets.",
      stock: "A stock acquisition generally preserves the historical tax basis of the target's assets. Buyer deductions from §197 amortization and §168 depreciation follow that historical basis rather than the purchase price. Net operating losses and other tax attributes generally remain with the entity and continue subject to the limitations described separately.",
      stock_with_338_h_10: "A stock acquisition with a §338(h)(10) election is treated for federal tax purposes as a deemed asset acquisition. The acquired entity is generally treated as having sold its assets at fair market value, and the buyer takes a stepped-up basis in those assets as allocated. The election has specific preconditions; the system does not verify them.",
      stock_with_336_e: "A stock acquisition with a §336(e) election is generally treated for federal tax purposes as a deemed asset disposition by the target. Basis treatment for the buyer follows the deemed-asset framework, similar in effect to §338(h)(10), under a different set of preconditions. The system does not verify the preconditions.",
    },
    not_computable_reasons: {
      deal_structure_unspecified: "deal structure not specified",
      target_entity_type_unknown: "target entity type not known",
    },
    provenance_fields: [
      { name: "deal_structure", source: "scenario_assumption" },
      { name: "target_entity_type", source: "canonical_market_truth" },
    ],
    non_emission_when_inapplicable: false,
  },
  {
    consequence_id: "tax.election_effect_338_h_10",
    domain: "tax_structural_treatment", bucket: "A",
    required_inputs: ["deal_structure", "target_entity_type"],
    emitted_text: {
      stock: "A §338(h)(10) election is generally available where the target is an S-corporation or a consolidated subsidiary and the buyer is a corporation, subject to a joint election by buyer and seller. If made, the election causes the stock acquisition to be treated for federal tax purposes as a deemed asset acquisition, with a stepped-up basis to the buyer and recognition of gain by the seller at the asset level. The election is not selected in this scenario.",
      stock_with_338_h_10: "This scenario assumes a §338(h)(10) election. For federal tax purposes the acquisition is treated as a deemed asset acquisition by a new target. The buyer's basis in the deemed-acquired assets is generally the allocated purchase price; the seller generally recognizes gain or loss at the asset level on the deemed sale. The election requires a joint filing by buyer and seller and has specific eligibility preconditions; the system does not verify those preconditions.",
    },
    not_computable_reasons: {
      deal_structure_unspecified: "deal structure not specified",
      target_entity_type_unknown: "target entity type not known",
    },
    provenance_fields: [
      { name: "deal_structure", source: "scenario_assumption" },
      { name: "target_entity_type", source: "canonical_market_truth" },
    ],
    non_emission_when_inapplicable: true,
  },
  {
    consequence_id: "tax.election_effect_336_e",
    domain: "tax_structural_treatment", bucket: "A",
    required_inputs: ["deal_structure", "target_entity_type"],
    emitted_text: {
      stock: "A §336(e) election is generally available for certain qualifying domestic stock dispositions by a corporate seller or S-corporation shareholders, subject to its specific eligibility rules. If made, the election causes the disposition to be treated for federal tax purposes as a deemed asset disposition by the target, producing basis-step-up effects similar to a §338(h)(10) election under a different procedural framework. The election is not selected in this scenario.",
      stock_with_336_e: "This scenario assumes a §336(e) election. The disposition is treated for federal tax purposes as a deemed asset disposition by the target, with the buyer taking a basis in the deemed-acquired assets generally equal to the allocated purchase price. The election has specific eligibility preconditions distinct from §338(h)(10); the system does not verify those preconditions.",
    },
    not_computable_reasons: {
      deal_structure_unspecified: "deal structure not specified",
      target_entity_type_unknown: "target entity type not known",
    },
    provenance_fields: [
      { name: "deal_structure", source: "scenario_assumption" },
      { name: "target_entity_type", source: "canonical_market_truth" },
    ],
    non_emission_when_inapplicable: true,
    review_before_production: true,
  },
  {
    consequence_id: "tax.nol_carryover_categorical",
    domain: "tax_structural_treatment", bucket: "A",
    required_inputs: ["disclosed_nols_present", "deal_structure"],
    emitted_text: "Disclosed NOLs generally remain with the entity in a stock acquisition and may be subject to limitation under IRC §382. The system does not compute the §382 limitation; the categorical statement is informational only.",
    not_computable_reasons: {},
    provenance_fields: [
      { name: "disclosed_nols_present", source: "canonical_market_truth" },
      { name: "deal_structure", source: "scenario_assumption" },
    ],
    non_emission_when_inapplicable: true,
  },
  {
    consequence_id: "tax.character_1245_recapture",
    domain: "tax_basis_recovery", bucket: "A",
    required_inputs: ["ppa_equipment", "accelerated_depreciation_present"],
    emitted_text: "Gain attributable to prior depreciation on equipment classes may be characterized as §1245 ordinary-income recapture, to the extent prior depreciation was taken. The system reports the equipment allocation as an upper bound on §1245-exposed amount; actual recapture depends on the basis schedule, which is not in scope for MVP.",
    not_computable_reasons: {},
    provenance_fields: [
      { name: "ppa_equipment", source: "scenario_assumption" },
      { name: "accelerated_depreciation_present", source: "canonical_market_truth" },
      { name: "recapture_sensitive_classes_present", source: "canonical_market_truth" },
    ],
    non_emission_when_inapplicable: true,
  },
  {
    consequence_id: "tax.character_1250_recapture",
    domain: "tax_basis_recovery", bucket: "A",
    required_inputs: ["ppa_real_property"],
    emitted_text: "Real property gain may include §1250 recapture components depending on prior depreciation taken on the property. Characterization between ordinary and capital-rate treatment depends on the depreciation method and basis history, which are not in scope for MVP.",
    not_computable_reasons: {},
    provenance_fields: [
      { name: "ppa_real_property", source: "scenario_assumption" },
      { name: "ppa_real_property_class", source: "scenario_assumption" },
    ],
    non_emission_when_inapplicable: true,
  },
  {
    consequence_id: "tax.seller_note_interest_characterization",
    domain: "tax_structural_treatment", bucket: "A",
    required_inputs: ["seller_note.principal"],
    emitted_text: "Seller-note interest is generally characterized as ordinary interest expense to the buyer and ordinary interest income to the seller. Actual treatment may vary based on AFR, OID, and other applicable rules.",
    not_computable_reasons: {},
    provenance_fields: [
      { name: "seller_note.principal", source: "scenario_assumption" },
      { name: "seller_note.annual_rate", source: "scenario_assumption" },
      { name: "seller_note.term_years", source: "scenario_assumption" },
    ],
    non_emission_when_inapplicable: true,
  },
  {
    consequence_id: "tax.basis_step_up_mechanics",
    domain: "tax_basis_recovery", bucket: "A",
    required_inputs: ["deal_structure"],
    emitted_text: {
      asset: "Basis step-up: the buyer's basis in the acquired assets is generally the allocated purchase price. Amortization and depreciation deductions begin from that basis on the allocated classes.",
      stock: "Basis carryover: the buyer's basis in the target's assets is generally the target's historical basis, not the purchase price. Amortization and depreciation deductions continue on the historical basis schedule.",
      stock_with_338_h_10: "Deemed basis step-up under §338(h)(10): for federal tax purposes the transaction is treated as a deemed asset acquisition, and the buyer's basis in the deemed-acquired assets is generally the allocated purchase price. Amortization and depreciation deductions begin from that basis as if assets had been acquired directly.",
      stock_with_336_e: "Deemed basis step-up under §336(e): the transaction is generally treated for federal tax purposes as a deemed asset disposition by the target, with the buyer's basis in the deemed-acquired assets following the allocated purchase price under the §336(e) framework.",
    },
    not_computable_reasons: {
      deal_structure_unspecified: "deal structure not specified",
    },
    provenance_fields: [
      { name: "deal_structure", source: "scenario_assumption" },
    ],
    non_emission_when_inapplicable: false,
    review_before_production: true, // stock_with_336_e wording flagged
  },
  {
    consequence_id: "tax.remaining_tax_basis_by_class",
    domain: "tax_basis_recovery", bucket: "A",
    required_inputs: ["existing_tax_basis_disclosed", "existing_tax_basis_by_class"],
    // The class lines are assembled by the calculator from per-class pairs; the
    // fixed trailer is the constitutional sentence and is stored here verbatim.
    emitted_text: "Existing basis is the seller's disclosed tax basis. Scenario allocation is the buyer's assumed purchase-price allocation. The two are presented side by side; the system does not characterize the difference.",
    not_computable_reasons: {
      basis_not_disclosed: "existing tax basis not disclosed",
      no_per_class_values: "existing tax basis disclosure present but no per-class values",
      no_scenario_allocation: "no scenario purchase-price allocation to compare against",
    },
    provenance_fields: [
      { name: "existing_tax_basis_disclosed", source: "canonical_market_truth" },
    ],
    non_emission_when_inapplicable: false,
  },
  {
    consequence_id: "tax.seller_character_split_categorical",
    domain: "tax_basis_recovery", bucket: "B",
    required_inputs: ["seller_ordinary_rate", "seller_capital_rate"],
    // Constitutional trailer (the part that forecloses the misread). The per-class
    // character lines are assembled by the calculator; this fixed text is the
    // boundary statement and is stored verbatim.
    emitted_text: "The system identifies which character category applies to each allocated class. It does not compute total recognized gain, total seller tax, or amount realized. Realized gain depends on the seller's basis, holding period, and other facts not in scope for MVP.",
    not_computable_reasons: {
      seller_ordinary_rate_missing: "seller ordinary rate not provided",
      seller_capital_rate_missing: "seller capital rate not provided",
      no_scenario_allocation: "no scenario purchase-price allocation to characterize",
    },
    provenance_fields: [
      { name: "seller_ordinary_rate", source: "scenario_assumption" },
      { name: "seller_capital_rate", source: "scenario_assumption" },
    ],
    non_emission_when_inapplicable: false,
  },
];

// Required-input map (consequence id → required input field names), derived from
// the catalog plus the arithmetic consequences not in the categorical catalog.
export const TAX_REQUIRED_INPUTS: Record<TaxConsequenceId, string[]> = {
  // categorical (mirror the catalog)
  "tax.structural_difference_asset_vs_stock": ["deal_structure", "target_entity_type"],
  "tax.election_effect_338_h_10": ["deal_structure", "target_entity_type"],
  "tax.election_effect_336_e": ["deal_structure", "target_entity_type"],
  "tax.nol_carryover_categorical": ["disclosed_nols_present", "deal_structure"],
  "tax.character_1245_recapture": ["ppa_equipment", "accelerated_depreciation_present"],
  "tax.character_1250_recapture": ["ppa_real_property"],
  "tax.seller_note_interest_characterization": ["seller_note.principal"],
  "tax.basis_step_up_mechanics": ["deal_structure"],
  "tax.remaining_tax_basis_by_class": ["existing_tax_basis_disclosed", "existing_tax_basis_by_class"],
  // arithmetic (Bucket A schedules)
  "tax.sec197_amortization_schedule": ["ppa_goodwill"], // or ppa_other_intangibles; calculator handles either
  "tax.macrs_recovery_schedule_equipment": ["ppa_equipment", "ppa_equipment_class"],
  "tax.macrs_recovery_schedule_real_property": ["ppa_real_property", "ppa_real_property_class"],
  // aggregate (Bucket A): requires at least one underlying schedule input; calculator handles the OR
  "tax.total_basis_recovery_schedule": ["ppa_goodwill"],
  // arithmetic (Bucket B tax shields) + categorical Bucket B
  "tax.annual_197_tax_shield": ["ppa_goodwill", "buyer_ordinary_rate"],
  "tax.annual_macrs_tax_shield_equipment": ["ppa_equipment", "ppa_equipment_class", "buyer_ordinary_rate"],
  "tax.seller_character_split_categorical": ["seller_ordinary_rate", "seller_capital_rate"],
};

// Bucket map (consequence id → bucket). Used to prove no Bucket C exists.
export const TAX_CONSEQUENCE_BUCKET: Record<TaxConsequenceId, TaxBucket> = {
  "tax.structural_difference_asset_vs_stock": "A",
  "tax.election_effect_338_h_10": "A",
  "tax.election_effect_336_e": "A",
  "tax.nol_carryover_categorical": "A",
  "tax.character_1245_recapture": "A",
  "tax.character_1250_recapture": "A",
  "tax.seller_note_interest_characterization": "A",
  "tax.basis_step_up_mechanics": "A",
  "tax.remaining_tax_basis_by_class": "A",
  "tax.sec197_amortization_schedule": "A",
  "tax.macrs_recovery_schedule_equipment": "A",
  "tax.macrs_recovery_schedule_real_property": "A",
  "tax.total_basis_recovery_schedule": "A",
  "tax.annual_197_tax_shield": "B",
  "tax.annual_macrs_tax_shield_equipment": "B",
  "tax.seller_character_split_categorical": "B",
};
