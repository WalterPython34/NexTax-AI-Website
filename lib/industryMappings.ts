// lib/industryMappings.ts
// Layer 2: Industry Mapping — connects NexTax keys ↔ NAICS codes ↔ RMA benchmarks
//
// Usage:
//   import { getNaicsFromIndustry, getIndustryFromNaics, INDUSTRY_MAPPINGS } from "@/lib/industryMappings";
//   const naics = getNaicsFromIndustry("landscaping");  // → "561730"
//   const label = getLabelFromKey("landscaping");        // → "Landscaping"

export interface IndustryMapping {
  label:      string;   // UI-facing name
  nextaxKey:  string;   // internal platform key
  naicsCode:  string;   // 6-digit NAICS (matches rma_benchmarks table)
  naics4:     string;   // 4-digit subsector
  naics2:     string;   // 2-digit sector
  category:   string;   // UI grouping
}

export const INDUSTRY_MAPPINGS: IndustryMapping[] = [
  // ── Home Services ──────────────────────────────────────────────────────
  { label: "Landscaping",               nextaxKey: "landscaping",    naicsCode: "561730", naics4: "5617", naics2: "56", category: "Home Services"       },
  { label: "Plumbing / HVAC",           nextaxKey: "plumbing",       naicsCode: "238220", naics4: "2382", naics2: "23", category: "Home Services"       },
  { label: "HVAC",                      nextaxKey: "hvac",           naicsCode: "238220", naics4: "2382", naics2: "23", category: "Home Services"       },
  { label: "Electrical Contractors",    nextaxKey: "electrical",     naicsCode: "238210", naics4: "2382", naics2: "23", category: "Home Services"       },
  { label: "Roofing",                   nextaxKey: "roofing",        naicsCode: "238160", naics4: "2381", naics2: "23", category: "Home Services"       },
  { label: "Painting",                  nextaxKey: "painting",       naicsCode: "238320", naics4: "2383", naics2: "23", category: "Home Services"       },
  { label: "Home Remodeling",           nextaxKey: "remodeling",     naicsCode: "236118", naics4: "2361", naics2: "23", category: "Home Services"       },
  { label: "General Construction",      nextaxKey: "construction",   naicsCode: "238990", naics4: "2389", naics2: "23", category: "Home Services"       },

  // ── Automotive ─────────────────────────────────────────────────────────
  { label: "Auto Repair",               nextaxKey: "autorepair",     naicsCode: "811111", naics4: "8111", naics2: "81", category: "Automotive"          },
  { label: "Car Wash",                  nextaxKey: "carwash",        naicsCode: "811192", naics4: "8111", naics2: "81", category: "Automotive"          },
  { label: "Gas Station / C-Store",     nextaxKey: "gasstation",     naicsCode: "447110", naics4: "4471", naics2: "44", category: "Automotive"          },

  // ── Food & Beverage ────────────────────────────────────────────────────
  { label: "Restaurant (Full Service)", nextaxKey: "restaurant",     naicsCode: "722511", naics4: "7225", naics2: "72", category: "Food & Beverage"     },
  { label: "Restaurant (Fast Casual)",  nextaxKey: "restaurant_qsr", naicsCode: "722513", naics4: "7225", naics2: "72", category: "Food & Beverage"     },
  { label: "Grocery Store",             nextaxKey: "grocery",        naicsCode: "445110", naics4: "4451", naics2: "44", category: "Food & Beverage"     },

  // ── Healthcare & Wellness ──────────────────────────────────────────────
  { label: "Dental Practice",           nextaxKey: "dental",         naicsCode: "621210", naics4: "6212", naics2: "62", category: "Healthcare"          },
  { label: "Med Spa / Aesthetics",      nextaxKey: "medspa",         naicsCode: "621111", naics4: "6211", naics2: "62", category: "Healthcare"          },
  { label: "Healthcare / Medical",      nextaxKey: "healthcare",     naicsCode: "621111", naics4: "6211", naics2: "62", category: "Healthcare"          },
  { label: "Physical Therapy",          nextaxKey: "physicaltherapy",naicsCode: "621340", naics4: "6213", naics2: "62", category: "Healthcare"          },
  { label: "Home Health Care",          nextaxKey: "seniorcare",     naicsCode: "621610", naics4: "6216", naics2: "62", category: "Healthcare"          },
  { label: "Veterinary Practice",       nextaxKey: "veterinary",     naicsCode: "541940", naics4: "5419", naics2: "54", category: "Healthcare"          },
  { label: "Pharmacy",                  nextaxKey: "pharmacy",       naicsCode: "446110", naics4: "4461", naics2: "44", category: "Healthcare"          },

  // ── Personal Services ──────────────────────────────────────────────────
  { label: "Hair Salon / Barbershop",   nextaxKey: "hairsalon",      naicsCode: "812112", naics4: "8121", naics2: "81", category: "Personal Services"   },
  { label: "Laundromat",                nextaxKey: "laundromat",     naicsCode: "812320", naics4: "8123", naics2: "81", category: "Personal Services"   },
  { label: "Pet Care / Grooming",       nextaxKey: "petcare",        naicsCode: "812910", naics4: "8129", naics2: "81", category: "Personal Services"   },
  { label: "Gym / Fitness Center",      nextaxKey: "gym",            naicsCode: "713940", naics4: "7139", naics2: "71", category: "Personal Services"   },
  { label: "Daycare / Childcare",       nextaxKey: "daycare",        naicsCode: "624410", naics4: "6244", naics2: "62", category: "Personal Services"   },

  // ── Business Services ──────────────────────────────────────────────────
  { label: "Accounting / CPA Firm",     nextaxKey: "accounting",     naicsCode: "541211", naics4: "5412", naics2: "54", category: "Business Services"   },
  { label: "Insurance Agency",          nextaxKey: "insurance",      naicsCode: "524210", naics4: "5242", naics2: "52", category: "Business Services"   },
  { label: "Staffing / Recruiting",     nextaxKey: "staffing",       naicsCode: "561311", naics4: "5613", naics2: "56", category: "Business Services"   },
  { label: "Marketing Agency",          nextaxKey: "marketing",      naicsCode: "541810", naics4: "5418", naics2: "54", category: "Business Services"   },
  { label: "Engineering Services",      nextaxKey: "engineering",    naicsCode: "541330", naics4: "5413", naics2: "54", category: "Business Services"   },
  { label: "Real Estate Brokerage",     nextaxKey: "realestatebrok", naicsCode: "531210", naics4: "5312", naics2: "53", category: "Business Services"   },
  { label: "Property Management",       nextaxKey: "propertymanage", naicsCode: "531311", naics4: "5313", naics2: "53", category: "Business Services"   },

  // ── Cleaning & Facilities ──────────────────────────────────────────────
  { label: "Cleaning Service",          nextaxKey: "cleaning",       naicsCode: "561720", naics4: "5617", naics2: "56", category: "Cleaning & Facilities"},
  { label: "Pest Control",              nextaxKey: "pestcontrol",    naicsCode: "561710", naics4: "5617", naics2: "56", category: "Cleaning & Facilities"},
  { label: "Self-Storage",              nextaxKey: "storage",        naicsCode: "531130", naics4: "5311", naics2: "53", category: "Cleaning & Facilities"},
  { label: "Security Services",         nextaxKey: "security",       naicsCode: "561621", naics4: "5616", naics2: "56", category: "Cleaning & Facilities"},

  // ── Trades & Specialty ─────────────────────────────────────────────────
  { label: "Printing / Sign Making",    nextaxKey: "printing",       naicsCode: "323111", naics4: "3231", naics2: "32", category: "Trades & Specialty"  },
  { label: "Sign Manufacturing",        nextaxKey: "signmaking",     naicsCode: "339950", naics4: "3399", naics2: "33", category: "Trades & Specialty"  },
  { label: "Transportation / Trucking", nextaxKey: "transportation", naicsCode: "484110", naics4: "4841", naics2: "48", category: "Trades & Specialty"  },

  // ── Digital ────────────────────────────────────────────────────────────
  { label: "E-commerce",                nextaxKey: "ecommerce",      naicsCode: "454110", naics4: "4541", naics2: "45", category: "Digital"             },
  { label: "SaaS / Software",           nextaxKey: "saas",           naicsCode: "511210", naics4: "5112", naics2: "51", category: "Digital"             },
];

// ── Fast lookup indexes (built once at module load) ───────────────────────────

const _byKey    = new Map<string, IndustryMapping>();
const _byNaics  = new Map<string, IndustryMapping>();
const _byLabel  = new Map<string, IndustryMapping>();

for (const m of INDUSTRY_MAPPINGS) {
  _byKey.set(m.nextaxKey.toLowerCase(), m);
  _byNaics.set(m.naicsCode, m);
  _byLabel.set(m.label.toLowerCase(), m);
}

// ── Public helpers ────────────────────────────────────────────────────────────

/**
 * Get 6-digit NAICS code from a NexTax industry key.
 * @example getNaicsFromIndustry("landscaping") // → "561730"
 */
export function getNaicsFromIndustry(nextaxKey: string): string | null {
  return _byKey.get(nextaxKey.toLowerCase())?.naicsCode ?? null;
}

/**
 * Get full mapping from a NexTax industry key.
 * @example getMappingFromKey("dental") // → { label: "Dental Practice", naicsCode: "621210", ... }
 */
export function getMappingFromKey(nextaxKey: string): IndustryMapping | null {
  return _byKey.get(nextaxKey.toLowerCase()) ?? null;
}

/**
 * Get NexTax key from a NAICS code.
 * @example getIndustryFromNaics("561730") // → "landscaping"
 */
export function getIndustryFromNaics(naicsCode: string): string | null {
  return _byNaics.get(naicsCode)?.nextaxKey ?? null;
}

/**
 * Get user-friendly label from a NexTax industry key.
 * @example getLabelFromKey("medspa") // → "Med Spa / Aesthetics"
 */
export function getLabelFromKey(nextaxKey: string): string {
  return _byKey.get(nextaxKey.toLowerCase())?.label ?? nextaxKey;
}

/**
 * Get all industries in a given category.
 * @example getByCategory("Healthcare") // → IndustryMapping[]
 */
export function getByCategory(category: string): IndustryMapping[] {
  return INDUSTRY_MAPPINGS.filter(m => m.category === category);
}

/**
 * Get all unique categories.
 */
export function getCategories(): string[] {
  return [...new Set(INDUSTRY_MAPPINGS.map(m => m.category))];
}

/**
 * Fuzzy lookup — tries key, then NAICS, then label substring.
 * Useful for classifying free-text input.
 * @example resolveIndustry("611730")  // by NAICS
 * @example resolveIndustry("Dental")  // by label substring
 */
export function resolveIndustry(input: string): IndustryMapping | null {
  const s = input.toLowerCase().trim();
  if (_byKey.has(s))   return _byKey.get(s)!;
  if (_byNaics.has(s)) return _byNaics.get(s)!;
  // Substring match on label
  for (const m of INDUSTRY_MAPPINGS) {
    if (m.label.toLowerCase().includes(s) || s.includes(m.nextaxKey)) return m;
  }
  return null;
}
