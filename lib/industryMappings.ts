// lib/industryMappings.ts  (v2 — benchmark-aware)
// Layer 2: Industry Mapping — NexTax keys ↔ NAICS ↔ RMA benchmarks ↔ model types
//
// Layer architecture:
//   Layer 1 → rma_benchmarks (raw RMA data)
//   Layer 2 → industryMappings (this file — connects everything)
//   Layer 3 → /api/benchmarks (scoring engine data feed)
//   Layer 4 → deal scoring + intelligence

export interface IndustryMapping {
  label:           string;    // UI-facing name
  nextaxKey:       string;    // internal platform key
  naicsCode:       string;    // 6-digit NAICS → joins to rma_benchmarks
  naics4:          string;
  naics2:          string;
  category:        string;    // UI grouping
  modelType:       ModelType; // how the business generates revenue
  subModel:        string[];  // specific operational drivers
  benchmarkFamily: BenchmarkFamily; // RMA scoring cluster
}

export type ModelType =
  | "service"    // labor/skill-based, low capex
  | "product"    // inventory-driven
  | "asset"      // real estate or equipment heavy
  | "recurring"  // subscription, route, or renewal-based
  | "mixed";     // combination

export type BenchmarkFamily =
  | "field_services"        // cleaning, pest, landscaping, security
  | "specialty_trade"       // roofing, electrical, plumbing, construction
  | "auto_services"         // auto repair, car wash, gas station
  | "food_beverage"         // restaurants, grocery
  | "healthcare_clinical"   // dental, medspa, PT, home health
  | "personal_services"     // salon, laundromat, gym, daycare
  | "professional_services" // accounting, insurance, staffing, marketing
  | "asset_services"        // storage, transportation
  | "digital";              // saas, ecommerce

export interface BenchmarkContext {
  naicsCode:       string;
  modelType:       ModelType;
  subModel:        string[];
  benchmarkFamily: BenchmarkFamily;
  label:           string;
}

export const INDUSTRY_MAPPINGS: IndustryMapping[] = [
  // ── Home Services ──────────────────────────────────────────────────────────
  { label:"Landscaping",             nextaxKey:"landscaping",    naicsCode:"561730", naics4:"5617", naics2:"56", category:"Home Services",        modelType:"service",   subModel:["labor_intensive","outdoor","route_based"],              benchmarkFamily:"field_services"        },
  { label:"Plumbing / HVAC",         nextaxKey:"plumbing",       naicsCode:"238220", naics4:"2382", naics2:"23", category:"Home Services",        modelType:"service",   subModel:["labor_intensive","project_based","licensed"],           benchmarkFamily:"specialty_trade"       },
  { label:"HVAC",                    nextaxKey:"hvac",           naicsCode:"238220", naics4:"2382", naics2:"23", category:"Home Services",        modelType:"service",   subModel:["labor_intensive","project_based","licensed"],           benchmarkFamily:"specialty_trade"       },
  { label:"Electrical Contractors",  nextaxKey:"electrical",     naicsCode:"238210", naics4:"2382", naics2:"23", category:"Home Services",        modelType:"service",   subModel:["labor_intensive","project_based","licensed"],           benchmarkFamily:"specialty_trade"       },
  { label:"Roofing",                 nextaxKey:"roofing",        naicsCode:"238160", naics4:"2381", naics2:"23", category:"Home Services",        modelType:"service",   subModel:["labor_intensive","project_based","weather_dependent"],  benchmarkFamily:"specialty_trade"       },
  { label:"Painting",                nextaxKey:"painting",       naicsCode:"238320", naics4:"2383", naics2:"23", category:"Home Services",        modelType:"service",   subModel:["labor_intensive","project_based"],                      benchmarkFamily:"specialty_trade"       },
  { label:"Home Remodeling",         nextaxKey:"remodeling",     naicsCode:"236118", naics4:"2361", naics2:"23", category:"Home Services",        modelType:"service",   subModel:["project_based","labor_intensive","asset_light"],        benchmarkFamily:"specialty_trade"       },
  { label:"General Construction",    nextaxKey:"construction",   naicsCode:"238990", naics4:"2389", naics2:"23", category:"Home Services",        modelType:"service",   subModel:["project_based","subcontractor_model"],                  benchmarkFamily:"specialty_trade"       },

  // ── Automotive ─────────────────────────────────────────────────────────────
  { label:"Auto Repair",             nextaxKey:"autorepair",     naicsCode:"811111", naics4:"8111", naics2:"81", category:"Automotive",          modelType:"service",   subModel:["labor_intensive","parts_margin","repeat_customer"],     benchmarkFamily:"auto_services"         },
  { label:"Car Wash",                nextaxKey:"carwash",        naicsCode:"811192", naics4:"8111", naics2:"81", category:"Automotive",          modelType:"asset",     subModel:["throughput_model","real_estate_value","low_labor"],     benchmarkFamily:"auto_services"         },
  { label:"Gas Station / C-Store",   nextaxKey:"gasstation",     naicsCode:"447110", naics4:"4471", naics2:"44", category:"Automotive",          modelType:"asset",     subModel:["fuel_volume","c_store_margin","real_estate_value"],     benchmarkFamily:"auto_services"         },

  // ── Food & Beverage ────────────────────────────────────────────────────────
  { label:"Restaurant (Full Svc)",   nextaxKey:"restaurant",     naicsCode:"722511", naics4:"7225", naics2:"72", category:"Food & Beverage",     modelType:"mixed",     subModel:["food_cost","labor_intensive","location_dependent"],     benchmarkFamily:"food_beverage"         },
  { label:"Restaurant (Fast Casual)",nextaxKey:"restaurant_qsr", naicsCode:"722513", naics4:"7225", naics2:"72", category:"Food & Beverage",     modelType:"mixed",     subModel:["food_cost","high_throughput","franchise_potential"],    benchmarkFamily:"food_beverage"         },
  { label:"Grocery Store",           nextaxKey:"grocery",        naicsCode:"445110", naics4:"4451", naics2:"44", category:"Food & Beverage",     modelType:"product",   subModel:["inventory_heavy","thin_margin","location_dependent"],   benchmarkFamily:"food_beverage"         },

  // ── Healthcare & Wellness ──────────────────────────────────────────────────
  { label:"Dental Practice",         nextaxKey:"dental",         naicsCode:"621210", naics4:"6212", naics2:"62", category:"Healthcare",          modelType:"service",   subModel:["recurring","insurance_dependent","licensed"],           benchmarkFamily:"healthcare_clinical"   },
  { label:"Med Spa / Aesthetics",    nextaxKey:"medspa",         naicsCode:"621111", naics4:"6211", naics2:"62", category:"Healthcare",          modelType:"service",   subModel:["cash_pay","high_margin_procedures","repeat_customer"],  benchmarkFamily:"healthcare_clinical"   },
  { label:"Healthcare / Medical",    nextaxKey:"healthcare",     naicsCode:"621111", naics4:"6211", naics2:"62", category:"Healthcare",          modelType:"service",   subModel:["insurance_dependent","licensed","recurring"],           benchmarkFamily:"healthcare_clinical"   },
  { label:"Physical Therapy",        nextaxKey:"physicaltherapy",naicsCode:"621340", naics4:"6213", naics2:"62", category:"Healthcare",          modelType:"service",   subModel:["insurance_dependent","recurring","licensed"],           benchmarkFamily:"healthcare_clinical"   },
  { label:"Home Health Care",        nextaxKey:"seniorcare",     naicsCode:"621610", naics4:"6216", naics2:"62", category:"Healthcare",          modelType:"service",   subModel:["recurring","labor_intensive","medicaid_medicare"],      benchmarkFamily:"healthcare_clinical"   },
  { label:"Veterinary Practice",     nextaxKey:"veterinary",     naicsCode:"541940", naics4:"5419", naics2:"54", category:"Healthcare",          modelType:"service",   subModel:["recurring","licensed","cash_and_insurance"],            benchmarkFamily:"healthcare_clinical"   },
  { label:"Pharmacy",                nextaxKey:"pharmacy",       naicsCode:"446110", naics4:"4461", naics2:"44", category:"Healthcare",          modelType:"product",   subModel:["inventory_heavy","insurance_dependent","thin_margin"],  benchmarkFamily:"healthcare_clinical"   },

  // ── Personal Services ──────────────────────────────────────────────────────
  { label:"Hair Salon / Barbershop", nextaxKey:"hairsalon",      naicsCode:"812112", naics4:"8121", naics2:"81", category:"Personal Services",   modelType:"service",   subModel:["labor_intensive","chair_rental_model","walk_in"],       benchmarkFamily:"personal_services"     },
  { label:"Laundromat",              nextaxKey:"laundromat",     naicsCode:"812320", naics4:"8123", naics2:"81", category:"Personal Services",   modelType:"asset",     subModel:["low_labor","real_estate_value","recurring"],            benchmarkFamily:"personal_services"     },
  { label:"Pet Care / Grooming",     nextaxKey:"petcare",        naicsCode:"812910", naics4:"8129", naics2:"81", category:"Personal Services",   modelType:"service",   subModel:["recurring","labor_intensive","boarding_option"],        benchmarkFamily:"personal_services"     },
  { label:"Gym / Fitness Center",    nextaxKey:"gym",            naicsCode:"713940", naics4:"7139", naics2:"71", category:"Personal Services",   modelType:"service",   subModel:["membership_model","high_churn_risk","equipment_heavy"], benchmarkFamily:"personal_services"     },
  { label:"Daycare / Childcare",     nextaxKey:"daycare",        naicsCode:"624410", naics4:"6244", naics2:"62", category:"Personal Services",   modelType:"service",   subModel:["recurring","labor_intensive","regulated"],              benchmarkFamily:"personal_services"     },

  // ── Business Services ──────────────────────────────────────────────────────
  { label:"Accounting / CPA Firm",   nextaxKey:"accounting",     naicsCode:"541211", naics4:"5412", naics2:"54", category:"Business Services",   modelType:"service",   subModel:["recurring","high_margin","owner_dependent"],            benchmarkFamily:"professional_services" },
  { label:"Insurance Agency",        nextaxKey:"insurance",      naicsCode:"524210", naics4:"5242", naics2:"52", category:"Business Services",   modelType:"recurring", subModel:["commission_based","renewal_revenue","low_capex"],       benchmarkFamily:"professional_services" },
  { label:"Staffing / Recruiting",   nextaxKey:"staffing",       naicsCode:"561311", naics4:"5613", naics2:"56", category:"Business Services",   modelType:"service",   subModel:["spread_margin","labor_arbitrage","b2b"],                benchmarkFamily:"professional_services" },
  { label:"Marketing Agency",        nextaxKey:"marketing",      naicsCode:"541810", naics4:"5418", naics2:"54", category:"Business Services",   modelType:"service",   subModel:["project_based","retainer_potential","owner_dependent"], benchmarkFamily:"professional_services" },
  { label:"Engineering Services",    nextaxKey:"engineering",    naicsCode:"541330", naics4:"5413", naics2:"54", category:"Business Services",   modelType:"service",   subModel:["project_based","licensed","b2b"],                       benchmarkFamily:"professional_services" },
  { label:"Real Estate Brokerage",   nextaxKey:"realestatebrok", naicsCode:"531210", naics4:"5312", naics2:"53", category:"Business Services",   modelType:"service",   subModel:["commission_based","transaction_based","licensed"],      benchmarkFamily:"professional_services" },
  { label:"Property Management",     nextaxKey:"propertymanage", naicsCode:"531311", naics4:"5313", naics2:"53", category:"Business Services",   modelType:"recurring", subModel:["fee_per_unit","recurring","scalable"],                  benchmarkFamily:"professional_services" },

  // ── Cleaning & Facilities ──────────────────────────────────────────────────
  { label:"Cleaning Service",        nextaxKey:"cleaning",       naicsCode:"561720", naics4:"5617", naics2:"56", category:"Cleaning & Facilities",modelType:"service",  subModel:["recurring","labor_intensive","route_based"],            benchmarkFamily:"field_services"        },
  { label:"Pest Control",            nextaxKey:"pestcontrol",    naicsCode:"561710", naics4:"5617", naics2:"56", category:"Cleaning & Facilities",modelType:"recurring",subModel:["recurring","route_based","chemical_cost"],              benchmarkFamily:"field_services"        },
  { label:"Self-Storage",            nextaxKey:"storage",        naicsCode:"531130", naics4:"5311", naics2:"53", category:"Cleaning & Facilities",modelType:"asset",    subModel:["real_estate_value","low_labor","recurring"],            benchmarkFamily:"asset_services"        },
  { label:"Security Services",       nextaxKey:"security",       naicsCode:"561621", naics4:"5616", naics2:"56", category:"Cleaning & Facilities",modelType:"recurring",subModel:["monitoring_revenue","installation_margin","b2b_b2c"],  benchmarkFamily:"field_services"        },

  // ── Trades & Specialty ─────────────────────────────────────────────────────
  { label:"Printing / Sign Making",  nextaxKey:"printing",       naicsCode:"323111", naics4:"3231", naics2:"32", category:"Trades & Specialty",  modelType:"mixed",     subModel:["equipment_heavy","project_and_product"],                benchmarkFamily:"specialty_trade"       },
  { label:"Sign Manufacturing",      nextaxKey:"signmaking",     naicsCode:"339950", naics4:"3399", naics2:"33", category:"Trades & Specialty",  modelType:"mixed",     subModel:["manufacturing","project_based","equipment_heavy"],      benchmarkFamily:"specialty_trade"       },
  { label:"Transportation / Trucking",nextaxKey:"transportation", naicsCode:"484110", naics4:"4841", naics2:"48", category:"Trades & Specialty", modelType:"asset",     subModel:["fleet_dependent","fuel_cost","dot_regulated"],          benchmarkFamily:"asset_services"        },

  // ── Digital ────────────────────────────────────────────────────────────────
  { label:"E-commerce",              nextaxKey:"ecommerce",      naicsCode:"454110", naics4:"4541", naics2:"45", category:"Digital",             modelType:"product",   subModel:["inventory_light","marketplace_dependent","scalable"],   benchmarkFamily:"digital"               },
  { label:"SaaS / Software",         nextaxKey:"saas",           naicsCode:"511210", naics4:"5112", naics2:"51", category:"Digital",             modelType:"recurring", subModel:["arr_model","high_margin","scalable","churn_risk"],      benchmarkFamily:"digital"               },
];

// ── Lookup indexes ────────────────────────────────────────────────────────────

const _byKey   = new Map<string, IndustryMapping>(
  INDUSTRY_MAPPINGS.map(m => [m.nextaxKey.toLowerCase(), m])
);
const _byNaics = new Map<string, IndustryMapping>(
  INDUSTRY_MAPPINGS.map(m => [m.naicsCode, m])
);

// ── Core helpers ──────────────────────────────────────────────────────────────

/** "landscaping" → "561730" */
export function getNaicsFromIndustry(nextaxKey: string): string | null {
  return _byKey.get(nextaxKey.toLowerCase())?.naicsCode ?? null;
}

/** "561730" → "landscaping" */
export function getIndustryFromNaics(naicsCode: string): string | null {
  return _byNaics.get(naicsCode)?.nextaxKey ?? null;
}

/** "medspa" → "Med Spa / Aesthetics" */
export function getLabelFromKey(nextaxKey: string): string {
  return _byKey.get(nextaxKey.toLowerCase())?.label ?? nextaxKey;
}

/** Full mapping object by key */
export function getMappingFromKey(nextaxKey: string): IndustryMapping | null {
  return _byKey.get(nextaxKey.toLowerCase()) ?? null;
}

/** All industries in a category */
export function getByCategory(category: string): IndustryMapping[] {
  return INDUSTRY_MAPPINGS.filter(m => m.category === category);
}

/** All unique categories */
export function getCategories(): string[] {
  return [...new Set(INDUSTRY_MAPPINGS.map(m => m.category))];
}

/** Fuzzy resolve — tries key, NAICS, then label substring */
export function resolveIndustry(input: string): IndustryMapping | null {
  const s = input.toLowerCase().trim();
  if (_byKey.has(s))   return _byKey.get(s)!;
  if (_byNaics.has(s)) return _byNaics.get(s)!;
  for (const m of INDUSTRY_MAPPINGS) {
    if (m.label.toLowerCase().includes(s) || s.includes(m.nextaxKey)) return m;
  }
  return null;
}

// ── NEW: Benchmark context ────────────────────────────────────────────────────

/**
 * Returns the benchmark metadata needed to query rma_benchmarks
 * and apply model-specific scoring logic.
 *
 * @example
 *   const ctx = getBenchmarkContext("landscaping");
 *   // → { naicsCode: "561730", modelType: "service",
 *   //     subModel: ["labor_intensive","outdoor","route_based"],
 *   //     benchmarkFamily: "field_services", label: "Landscaping" }
 *
 *   const naics = ctx?.naicsCode;  // use to query /api/benchmarks?naics=561730
 */
export function getBenchmarkContext(nextaxKey: string): BenchmarkContext | null {
  const m = _byKey.get(nextaxKey.toLowerCase());
  if (!m) return null;
  return {
    naicsCode:       m.naicsCode,
    modelType:       m.modelType,
    subModel:        m.subModel,
    benchmarkFamily: m.benchmarkFamily,
    label:           m.label,
  };
}

/**
 * Returns all industries sharing the same benchmark family.
 * Useful for cross-industry comparison and fallback scoring.
 *
 * @example getByBenchmarkFamily("field_services")
 * // → [landscaping, cleaning, pestcontrol, security]
 */
export function getByBenchmarkFamily(family: BenchmarkFamily): IndustryMapping[] {
  return INDUSTRY_MAPPINGS.filter(m => m.benchmarkFamily === family);
}

/**
 * Returns industries sharing the same model type.
 * @example getByModelType("recurring")
 * // → [insurance, pestcontrol, propertymanage, security, saas]
 */
export function getByModelType(modelType: ModelType): IndustryMapping[] {
  return INDUSTRY_MAPPINGS.filter(m => m.modelType === modelType);
}
