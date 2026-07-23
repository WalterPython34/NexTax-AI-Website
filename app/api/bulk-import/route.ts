import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scoreDeal, estimateSdeFromRevenue } from "@/lib/scoringEngine";
import { applyDealClassification } from "@/lib/dealClassifier";
import { normalizeDealFinancials, buildNormalizationPayload } from "@/lib/normalizationIntegration";
import { getNaicsFromIndustry } from "@/lib/industryMappings";
import { generateScoreExplanation } from "@/lib/scoreExplanation";
import type { IndustryBenchmarks } from "@/lib/types/benchmarks";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── BENCHMARK FETCHER ───────────────────────────────────────────────────────
// Queries rma_benchmarks directly — no HTTP round-trip needed server-side.

async function fetchBenchmarksForIndustry(
  nextaxKey: string,
): Promise<IndustryBenchmarks | null> {
  const naicsCode = getNaicsFromIndustry(nextaxKey);
  if (!naicsCode) return null;

  const { data: rows, error } = await supabase
    .from("rma_benchmarks")
    .select("metric_name, metric_value, industry_name, year")
    .eq("naics_code", naicsCode)
    .eq("year", "2025-26");

  if (error || !rows || rows.length === 0) return null;

  const get = (key: string): number | null =>
    rows.find(r => r.metric_name === key)?.metric_value ?? null;

  const debtToEquity = get("debt_to_equity");
  const coverage     = get("interest_coverage");
  const ebitda       = get("ebitda_margin_pct");

  return {
    naics_code:               naicsCode,
    industry_name:            rows[0].industry_name ?? nextaxKey,
    year:                     rows[0].year ?? "2025-26",
    operating_margin_pct:     get("operating_margin_pct"),
    pretax_margin_pct:        get("pretax_margin_pct"),
    ebitda_margin_pct:        ebitda,
    current_ratio:            get("current_ratio"),
    debt_to_equity:           debtToEquity,
    interest_coverage:        coverage,
    asset_turnover:           get("asset_turnover"),
    sales_to_working_capital: get("sales_to_working_capital"),
    return_on_assets:         get("return_on_assets"),
    total_revenue:            get("total_revenue"),
    total_assets:             get("total_assets"),
    implied_sde_margin:       ebitda,
    leverage_flag:
      debtToEquity === null ? null :
      debtToEquity < 1.5    ? "low" :
      debtToEquity < 3.0    ? "moderate" : "high",
    coverage_flag:
      coverage === null ? null :
      coverage >= 3.0   ? "strong" :
      coverage >= 1.5   ? "adequate" : "weak",
  };
}

// ─── INDUSTRY CLASSIFIER ────────────────────────────────────────────────────
// ORDERING MATTERS: classifyIndustry() returns on FIRST substring match,
// iterating in insertion order. Specific multi-word phrases must appear
// BEFORE generic single words, or the generic key steals the listing.
// Bare single words that appear in ordinary prose (consulting, platform,
// franchise, laser) are deliberately excluded — they misclassified more
// than they caught.
const INDUSTRY_MAP: Record<string, string> = {
  // ══ SPECIFIC MULTI-WORD PHRASES FIRST ══════════════════════════════════

  // ── Manufacturing (was entirely missing — every listing failed to classify)
  "contract manufacturing": "manufacturing", "custom manufacturing": "manufacturing",
  "precision machining": "manufacturing", "machine shop": "manufacturing",
  "cnc machining": "manufacturing", "metal fabrication": "manufacturing",
  "sheet metal": "manufacturing", "steel fabrication": "manufacturing",
  "plastics manufacturing": "manufacturing", "injection molding": "manufacturing",
  "food manufacturing": "manufacturing", "industrial manufacturing": "manufacturing",
  "product manufacturing": "manufacturing", "manufacturing company": "manufacturing",
  "manufacturing business": "manufacturing", "tool and die": "manufacturing",
  "powder coating": "manufacturing", "wood products": "manufacturing",
  "cabinet manufacturing": "manufacturing", "furniture manufacturing": "manufacturing",
  fabrication: "manufacturing", machining: "manufacturing", manufacturer: "manufacturing",
  manufacturing: "manufacturing", foundry: "manufacturing",

  // ── Engineering (before "consulting" and generic terms)
  "civil engineering": "engineering", "mechanical engineering": "engineering",
  "environmental engineering": "engineering", "structural engineering": "engineering",
  "electrical engineering": "engineering", "industrial engineering": "engineering",
  "geotechnical engineering": "engineering", "consulting engineer": "engineering",
  "engineering & consulting": "engineering", "engineering consulting": "engineering",
  "engineering firm": "engineering", "engineering services": "engineering",
  "land surveying": "engineering", "surveying firm": "engineering",
  engineering: "engineering",

  // ── Marketing (before generic "agency" / "consulting")
  "marketing agency": "marketing", "digital marketing": "marketing",
  "marketing services": "marketing", "advertising agency": "marketing",
  "seo agency": "marketing", "social media agency": "marketing",
  "marketing consulting": "marketing", "creative agency": "marketing",
  "branding agency": "marketing", "media agency": "marketing",
  "public relations": "marketing", "pr agency": "marketing",

  // ── Veterinary (before medspa's "laser" and healthcare's "clinic")
  "veterinary practice": "veterinary", "veterinary clinic": "veterinary",
  "veterinary hospital": "veterinary", "animal hospital": "veterinary",
  "animal clinic": "veterinary", "vet clinic": "veterinary",
  "vet practice": "veterinary", "equine practice": "veterinary",
  "small animal": "veterinary", veterinarian: "veterinary", veterinary: "veterinary",

  // ── Real Estate Brokerage
  "real estate brokerage": "realestatebrok", "real estate agency": "realestatebrok",
  "real estate office": "realestatebrok", "real estate broker": "realestatebrok",
  "realty group": "realestatebrok", "realty company": "realestatebrok",
  "title agency": "realestatebrok", "title company": "realestatebrok",
  realty: "realestatebrok",

  // ── Property Management (before "management" anywhere else)
  "property management": "propertymanage", "property manager": "propertymanage",
  "hoa management": "propertymanage", "rental management": "propertymanage",
  "apartment management": "propertymanage", "community association management": "propertymanage",
  "airbnb management": "propertymanage", "short term rental management": "propertymanage",
  "vacation rental management": "propertymanage",

  // ── Grocery (before "convenience store" which belongs to gasstation)
  "grocery store": "grocery", "specialty grocery": "grocery",
  "ethnic grocery": "grocery", "food market": "grocery", "farmers market": "grocery",
  "health food store": "grocery", "butcher shop": "grocery", "meat market": "grocery",
  "liquor store": "grocery", "wine shop": "grocery", "package store": "grocery",
  supermarket: "grocery", grocery: "grocery", deli: "grocery",

  // ── Sign Making
  "sign making": "signmaking", "sign manufacturer": "signmaking", "sign company": "signmaking",
  "sign shop": "signmaking", "custom signs": "signmaking", "vehicle wrap": "signmaking",
  "screen printing": "signmaking", "embroidery shop": "signmaking",
  "promotional products": "signmaking", "awards and engraving": "signmaking",
  signage: "signmaking",

  // ── Remodeling (before "restoration" and construction's generic keys)
  "home remodeling": "remodeling", "home renovation": "remodeling",
  "kitchen remodel": "remodeling", "bathroom remodel": "remodeling",
  "kitchen and bath": "remodeling", "basement finishing": "remodeling",
  "disaster restoration": "remodeling", "water restoration": "remodeling",
  "fire restoration": "remodeling", "water damage": "remodeling",
  "restoration company": "remodeling", "remodeling contractor": "remodeling",
  remodeling: "remodeling", renovation: "remodeling", restoration: "remodeling",

  // ── Gas Station (before grocery's and cleaning's generics)
  "gas station and convenience": "gasstation", "gas station & convenience": "gasstation",
  "gas station/c-store": "gasstation", "convenience store & gas": "gasstation",
  "gas station": "gasstation", "fuel station": "gasstation", "service station": "gasstation",
  "gasoline station": "gasstation", "petrol station": "gasstation",
  "truck stop": "gasstation", "c-store": "gasstation", "convenience store": "gasstation",

  // ── Physical Therapy (before healthcare's "clinic")
  "physical therapy": "physicaltherapy", "physical therapist": "physicaltherapy",
  "occupational therapy": "physicaltherapy", "speech therapy": "physicaltherapy",
  "therapy practice": "physicaltherapy", "rehab clinic": "physicaltherapy",
  "sports medicine": "physicaltherapy", "chiropractic clinic": "physicaltherapy",
  chiropractic: "physicaltherapy", chiropractor: "physicaltherapy",

  // ── Senior Care (before healthcare)
  "senior care": "seniorcare", "elder care": "seniorcare", "home health": "seniorcare",
  "home healthcare": "seniorcare", "assisted living": "seniorcare",
  "senior living": "seniorcare", "home care": "seniorcare",
  "in home care": "seniorcare", "non medical home care": "seniorcare",
  "adult day care": "seniorcare", "memory care": "seniorcare", hospice: "seniorcare",

  // ── Staffing (before healthcare's staffing entries)
  "staffing agency": "staffing", "staffing firm": "staffing", "staffing company": "staffing",
  "recruiting firm": "staffing", "temp agency": "staffing", "employment agency": "staffing",
  "workforce solutions": "staffing", "hr staffing": "staffing",
  "executive search": "staffing", "professional employer": "staffing",
  recruiting: "staffing",

  // ── Pest Control
  "pest control": "pestcontrol", "pest management": "pestcontrol",
  "termite control": "pestcontrol", "wildlife removal": "pestcontrol",
  "mosquito control": "pestcontrol", exterminator: "pestcontrol", termite: "pestcontrol",

  // ── Med Spa (specific first; bare "laser" and "cosmetic" removed)
  "med spa": "medspa", "medical spa": "medspa", "medical aesthetics": "medspa",
  "laser hair removal": "medspa", "laser clinic": "medspa", "cosmetic clinic": "medspa",
  "aesthetics clinic": "medspa", "wellness spa": "medspa", "day spa": "medspa",
  "iv therapy": "medspa", "weight loss clinic": "medspa",
  medspa: "medspa", botox: "medspa", dermatology: "medspa", aesthetics: "medspa",
  tanning: "medspa", "massage therapy": "medspa",

  // ── Accounting (bare "consulting" REMOVED — it stole engineering/marketing)
  "accounting firm": "accounting", "accounting & consulting": "accounting",
  "accounting & tax": "accounting", "tax accounting": "accounting",
  "tax & accounting": "accounting", "tax preparation": "accounting",
  "tax service": "accounting", "tax firm": "accounting", "tax return": "accounting",
  "cpa firm": "accounting", "cpa practice": "accounting",
  "bookkeeping service": "accounting", "payroll service": "accounting",
  "financial services": "accounting", "wealth management": "accounting",
  "financial planning": "accounting", "registered investment advisor": "accounting",
  accounting: "accounting", bookkeeping: "accounting", cpa: "accounting",

  // ══ ESTABLISHED INDUSTRIES ═════════════════════════════════════════════

  // ── Laundromat
  "coin laundry": "laundromat", "wash and fold": "laundromat",
  "dry cleaning": "laundromat", "dry clean": "laundromat",
  "commercial laundry": "laundromat", "linen service": "laundromat",
  laundromat: "laundromat", laundry: "laundromat",

  // ── HVAC
  "heating and cooling": "hvac", "air conditioning": "hvac", "hvac/r": "hvac",
  "heating & air": "hvac", "climate control": "hvac", "duct cleaning": "hvac",
  hvac: "hvac", refrigeration: "hvac", heating: "hvac",

  // ── Landscaping
  "lawn care": "landscaping", "lawn service": "landscaping", "lawn maintenance": "landscaping",
  "tree service": "landscaping", "tree care": "landscaping", "tree removal": "landscaping",
  "pool service": "landscaping", "pool and spa": "landscaping", "pool & spa": "landscaping",
  "pool cleaning": "landscaping", "pool maintenance": "landscaping",
  "snow removal": "landscaping", "hardscape": "landscaping", "grounds maintenance": "landscaping",
  landscaping: "landscaping", landscape: "landscaping", irrigation: "landscaping",

  // ── Car Wash (bare "detailing" REMOVED — it stole remodeling listings)
  "car wash": "carwash", "auto wash": "carwash", "car detailing": "carwash",
  "auto detailing": "carwash", "mobile detailing": "carwash", "express wash": "carwash",
  carwash: "carwash",

  // ── Dental
  "dental practice": "dental", "dental office": "dental", "dental clinic": "dental",
  "oral surgery": "dental", "pediatric dentistry": "dental",
  dental: "dental", dentist: "dental", orthodont: "dental", endodont: "dental",

  // ── Gym
  "fitness center": "gym", "health club": "gym", "yoga studio": "gym",
  "martial arts": "gym", "personal training": "gym", "fitness studio": "gym",
  gym: "gym", crossfit: "gym", pilates: "gym", boxing: "gym", fitness: "gym",

  // ── Restaurant (bare "franchise" and "vending" removed as ambiguous)
  "bar and grill": "restaurant", "coffee shop": "restaurant", "fast food": "restaurant",
  "food truck": "restaurant", "ice cream": "restaurant", "juice bar": "restaurant",
  "food service": "restaurant", "food route": "restaurant", "food distribution": "restaurant",
  "beverage distribution": "restaurant", "sports bar": "restaurant",
  "fine dining": "restaurant", "quick service": "restaurant",
  restaurant: "restaurant", pizzeria: "restaurant", brewery: "restaurant",
  cafe: "restaurant", bakery: "restaurant", catering: "restaurant",

  // ── Clothing Retail
  "retail clothing": "clothing", "clothing store": "clothing",
  "women's apparel": "clothing", "mens apparel": "clothing", "shoe store": "clothing",
  "bridal shop": "clothing", "consignment shop": "clothing", "resale boutique": "clothing",
  clothing: "clothing", apparel: "clothing", menswear: "clothing",
  boutique: "clothing", sneaker: "clothing",

  // ── Auto Repair
  "auto repair": "autorepair", "auto body": "autorepair", "tire shop": "autorepair",
  "oil change": "autorepair", "auto glass": "autorepair", "auto dealership": "autorepair",
  "auto salvage": "autorepair", "collision center": "autorepair",
  "truck repair": "autorepair", "fleet maintenance": "autorepair",
  "muffler shop": "autorepair", "smog check": "autorepair",
  automotive: "autorepair", mechanic: "autorepair", transmission: "autorepair",

  // ── Cleaning
  "commercial cleaning": "cleaning", "carpet cleaning": "cleaning",
  "window cleaning": "cleaning", "pressure washing": "cleaning",
  "maid service": "cleaning", "house cleaning": "cleaning",
  "waste management": "cleaning", "junk removal": "cleaning",
  "portable toilet": "cleaning", "dumpster rental": "cleaning",
  janitorial: "cleaning", dumpster: "cleaning", cleaning: "cleaning",

  // ── Ecommerce
  "e-commerce": "ecommerce", "online store": "ecommerce", "online retail": "ecommerce",
  "amazon fba": "ecommerce", "amazon business": "ecommerce", "shopify store": "ecommerce",
  ecommerce: "ecommerce", dropship: "ecommerce", fba: "ecommerce",

  // ── SaaS (bare "app", "platform", "subscription", "software" removed)
  "software company": "saas", "software platform": "saas", "saas platform": "saas",
  "software as a service": "saas", "mobile app": "saas", "web application": "saas",
  "managed services provider": "saas", "it services": "saas", "msp": "saas",
  saas: "saas",

  // ── Insurance
  "insurance agency": "insurance", "insurance broker": "insurance",
  "insurance brokerage": "insurance", "benefits agency": "insurance",
  insurance: "insurance",

  // ── Plumbing
  "water heater": "plumbing", "septic service": "plumbing", "water treatment": "plumbing",
  "well service": "plumbing", "drain cleaning": "plumbing", "sewer service": "plumbing",
  "backflow testing": "plumbing",
  plumbing: "plumbing", plumber: "plumbing", septic: "plumbing", drain: "plumbing",

  // ── Roofing
  "roofing company": "roofing", "roofing contractor": "roofing",
  "commercial roofing": "roofing", "residential roofing": "roofing",
  "gutter installation": "roofing",
  roofing: "roofing", roofer: "roofing", roof: "roofing", siding: "roofing",

  // ── Pet Care
  "pet grooming": "petcare", "dog grooming": "petcare", "pet sitting": "petcare",
  "doggy daycare": "petcare", "dog daycare": "petcare", "pet boarding": "petcare",
  "pet supply": "petcare", "pet store": "petcare", "dog training": "petcare",
  "pet care": "petcare", kennel: "petcare",

  // ── Pharmacy
  "independent pharmacy": "pharmacy", "retail pharmacy": "pharmacy",
  "compounding pharmacy": "pharmacy", "drug store": "pharmacy",
  pharmacy: "pharmacy", compounding: "pharmacy",

  // ── Daycare
  "child care": "daycare", "learning center": "daycare", "after school": "daycare",
  "early learning": "daycare", "day care center": "daycare",
  daycare: "daycare", childcare: "daycare", preschool: "daycare", montessori: "daycare",

  // ── Electrical
  "electrical contractor": "electrical", "electrical service": "electrical",
  "electrical company": "electrical", "low voltage": "electrical",
  "solar installation": "electrical", "generator installation": "electrical",
  electrical: "electrical", electrician: "electrical", wiring: "electrical",

  // ── Healthcare (generic — last among medical so specific practices win)
  "medical practice": "healthcare", "medical clinic": "healthcare",
  "urgent care": "healthcare", "primary care": "healthcare",
  "mental health": "healthcare", "behavioral health": "healthcare",
  "healthcare staffing": "healthcare", "medical staffing": "healthcare",
  "nurse staffing": "healthcare", "medical billing": "healthcare",
  "optometry practice": "healthcare", "audiology practice": "healthcare",
  "imaging center": "healthcare", "dialysis center": "healthcare",
  counseling: "healthcare", clinic: "healthcare",

  // ── Transportation
  "moving company": "transportation", "freight broker": "transportation",
  "dump truck": "transportation", "last mile delivery": "transportation",
  "medical transport": "transportation", "non emergency medical transport": "transportation",
  "school bus": "transportation", "bus company": "transportation",
  transportation: "transportation", trucking: "transportation", logistics: "transportation",
  freight: "transportation", courier: "transportation", hauling: "transportation",
  towing: "transportation", limousine: "transportation", limo: "transportation",
  shuttle: "transportation", moving: "transportation", delivery: "transportation",

  // ── Printing
  "print shop": "printing", "print & marketing": "printing", "b2b print": "printing",
  "print/marketing": "printing", "commercial printing": "printing",
  "digital printing": "printing", "label printing": "printing",
  printing: "printing",

  // ── Self-Storage
  "self storage": "storage", "self-storage": "storage", "storage facility": "storage",
  "mini storage": "storage", "storage solutions": "storage",
  "rv storage": "storage", "boat storage": "storage", "climate controlled storage": "storage",
  storage: "storage", warehouse: "storage",

  // ── Painting
  "painting contractor": "painting", "painting company": "painting",
  "residential painting": "painting", "commercial painting": "painting",
  "paint contractor": "painting", "drywall and painting": "painting",
  painting: "painting", painter: "painting",

  // ── Security
  "security services": "security", "security company": "security",
  "security guard": "security", "alarm company": "security", "alarm system": "security",
  "fire protection": "security", "fire alarm": "security", "access control": "security",
  "camera installation": "security",
  surveillance: "security", security: "security",

  // ── Hair Salon
  "hair salon": "hairsalon", "beauty salon": "hairsalon", "barber shop": "hairsalon",
  "hair care": "hairsalon", "hair studio": "hairsalon", "nail salon": "hairsalon",
  "hair and nail": "hairsalon", "blow dry bar": "hairsalon", "lash studio": "hairsalon",
  barbershop: "hairsalon", salon: "hairsalon",

  // ── Construction (LAST — most generic contractor terms)
  "general contractor": "construction", "home improvement": "construction",
  "handyman services": "construction", "concrete contractor": "construction",
  "paving contractor": "construction", "fencing contractor": "construction",
  "flooring contractor": "construction", "excavation": "construction",
  "utility contractor": "construction", "commercial construction": "construction",
  "residential construction": "construction", "home builder": "construction",
  construction: "construction", handyman: "construction",
};

// INDUSTRY_MARGINS moved to @/lib/scoringEngine

// MULTIPLES moved to @/lib/scoringEngine

function classifyIndustry(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [keyword, industry] of Object.entries(INDUSTRY_MAP)) {
    if (lower.includes(keyword)) return industry;
  }
  return null;
}

// ─── DATA PARSING ────────────────────────────────────────────────────────────

function parseNumber(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/[$,\s]/g, "").replace(/[kK]$/, "000").replace(/[mM]$/, "000000");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseState(location: string): string | null {
  const stateMatch = location.match(/\b([A-Z]{2})\b/);
  return stateMatch ? stateMatch[1] : null;
}

function parseCity(location: string): string | null {
  const parts = location.split(",").map((s) => s.trim());
  return parts[0] || null;
}

function generateFingerprint(industry: string, revenue: number, sde: number, price: number, state: string | null): string {
  return `${industry}_${Math.round(revenue / 1000)}k_${Math.round(sde / 1000)}k_${Math.round(price / 1000)}k_${state || "us"}`.toLowerCase();
}

// ─── CONFIDENCE SCORING ──────────────────────────────────────────────────────

interface FieldExtraction {
  revenue: number | null;
  sde: number | null;
  price: number | null;
  sdeSource: "direct_sde" | "cash_flow" | "profit" | "estimated" | "none";
}

function extractFields(row: Record<string, string>, industry: string | null): FieldExtraction {
  const revenue = parseNumber(row.revenue || row.Revenue || row.gross_revenue || row["Gross Revenue"] || row["Annual Revenue"] || row["Net Revenue"] || row.ARR);
  const price = parseNumber(row.asking_price || row.price || row.Price || row["Asking Price"] || row["List Price"]);

  let sde: number | null = null;
  let sdeSource: FieldExtraction["sdeSource"] = "none";

  const directSDE = parseNumber(row.sde || row.SDE || row["Seller's Discretionary Earnings"] || row["Owner Benefit"]);
  if (directSDE) { sde = directSDE; sdeSource = "direct_sde"; }

  if (!sde) {
    const cashFlow = parseNumber(row.cash_flow || row["Cash Flow"] || row["Discretionary Cash Flow"]);
    if (cashFlow) { sde = cashFlow; sdeSource = "cash_flow"; }
  }

  if (!sde) {
    const profit = parseNumber(row.profit || row.Profit || row["Net Profit"] || row["Net Income"]);
    if (profit) { sde = profit; sdeSource = "profit"; }
  }

  if (!sde && revenue && industry) {
    // estimateSdeFromRevenue from scoringEngine — uses RMA when available.
    // benchmarks not fetched yet at extraction time; null triggers fallback margins.
    const est = estimateSdeFromRevenue(revenue, industry, null);
    sde = est.sde;
    sdeSource = "estimated";
  }

  return { revenue, sde, price, sdeSource };
}

function getConfidenceScore(sdeSource: FieldExtraction["sdeSource"], hasRevenue: boolean, hasPrice: boolean): "high" | "medium" | "low" {
  if (sdeSource === "direct_sde" && hasRevenue && hasPrice) return "high";
  if ((sdeSource === "cash_flow" || sdeSource === "profit") && hasRevenue && hasPrice) return "medium";
  return "low";
}

// ─── SCORING ─────────────────────────────────────────────────────────────────

// scoreDeal() now imported from @/lib/scoringEngine

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { listings, source_platform, batch_name } = body;

    if (!Array.isArray(listings) || listings.length === 0) {
      return NextResponse.json({ error: "No listings provided" }, { status: 400 });
    }

    const batchId = batch_name || `batch_${new Date().toISOString().split("T")[0]}_${source_platform?.toLowerCase().replace(/[\s.]/g, "") || "unknown"}_${Date.now().toString(36)}`;

    const results = {
      total: listings.length,
      imported: 0,
      skipped_industry: 0,
      skipped_threshold: 0,
      skipped_missing: 0,
      duplicates: 0,
      estimated_sde: 0,
      errors: 0,
      confidence: { high: 0, medium: 0, low: 0 },
      rejections: [] as { row: number; reason: string; details: string; industry?: string }[],
    };

    for (let idx = 0; idx < listings.length; idx++) {
      const row = listings[idx];
      try {
        const sourceUrl = row.source_url || row.url || row.URL || row.Link || row.link || null;
        const sourceListingId = row.listing_id || row.id || row.ID || null;

        const industryText = String(row.industry || row.Industry || row.category || row.Category || row.type || row.Type || row.title || row.Title || row.name || row.Name || "");
        const titleText = String(row.title || row.Title || row.name || row.Name || "");
        const industry = classifyIndustry(industryText) || classifyIndustry(titleText);

        if (!industry) {
          results.skipped_industry++;
          results.rejections.push({ row: idx + 1, reason: "unknown_industry", details: `Could not classify "${industryText.slice(0, 60)}"`, industry: industryText.slice(0, 40) });
          await supabase.from("import_rejections").insert({
            source_platform, source_url: sourceUrl, source_listing_id: sourceListingId,
            raw_data: row, extracted_industry: industryText.slice(0, 100),
            rejection_reason: "unknown_industry",
            rejection_details: `Industry text "${industryText.slice(0, 80)}" did not match any tracked industry`,
            import_batch_id: batchId,
          }).then();
          continue;
        }

        const extracted = extractFields(row, industry);
        const location = String(row.location || row.Location || row.city || row.City || "");
        const state = parseState(location);
        const city = parseCity(location);
        const employees = parseNumber(row.employees || row.Employees || row["Number of Employees"]);
        const yearEstablished = parseNumber(row.year_established || row["Year Established"] || row.established || row.Founded);

        if (!extracted.revenue) {
          results.skipped_missing++;
          results.rejections.push({ row: idx + 1, reason: "missing_revenue", details: "No revenue field found", industry });
          await supabase.from("import_rejections").insert({
            source_platform, source_url: sourceUrl, source_listing_id: sourceListingId,
            raw_data: row, extracted_industry: industry, extracted_sde: extracted.sde, extracted_price: extracted.price, extracted_location: location,
            rejection_reason: "missing_revenue", rejection_details: "Revenue field not found or could not be parsed",
            import_batch_id: batchId,
          }).then();
          continue;
        }

        if (!extracted.sde) {
          results.skipped_missing++;
          results.rejections.push({ row: idx + 1, reason: "missing_sde", details: "No SDE/Cash Flow/Profit found and could not estimate", industry });
          await supabase.from("import_rejections").insert({
            source_platform, source_url: sourceUrl, source_listing_id: sourceListingId,
            raw_data: row, extracted_industry: industry, extracted_revenue: extracted.revenue, extracted_price: extracted.price, extracted_location: location,
            rejection_reason: "missing_sde", rejection_details: "No SDE, Cash Flow, or Profit field found",
            import_batch_id: batchId,
          }).then();
          continue;
        }

        if (!extracted.price) {
          results.skipped_missing++;
          results.rejections.push({ row: idx + 1, reason: "missing_price", details: "No asking price found", industry });
          await supabase.from("import_rejections").insert({
            source_platform, source_url: sourceUrl, source_listing_id: sourceListingId,
            raw_data: row, extracted_industry: industry, extracted_revenue: extracted.revenue, extracted_sde: extracted.sde, extracted_location: location,
            rejection_reason: "missing_price", rejection_details: "Asking price field not found or could not be parsed",
            import_batch_id: batchId,
          }).then();
          continue;
        }

        const rev = extracted.revenue!, sde = extracted.sde!, price = extracted.price!;
        if (rev < 200000 || sde < 75000 || price < 150000 || sde > rev || sde / rev > 0.9) {
          results.skipped_threshold++;
          const reason = rev < 200000 ? "Revenue below $200K" : sde < 75000 ? "SDE below $75K" : price < 150000 ? "Price below $150K" : sde > rev ? "SDE exceeds revenue" : "SDE margin too high";
          results.rejections.push({ row: idx + 1, reason: "below_threshold", details: reason, industry });
          await supabase.from("import_rejections").insert({
            source_platform, source_url: sourceUrl, source_listing_id: sourceListingId,
            raw_data: row, extracted_industry: industry, extracted_revenue: rev, extracted_sde: sde, extracted_price: price, extracted_location: location,
            rejection_reason: "below_threshold", rejection_details: reason,
            import_batch_id: batchId,
          }).then();
          continue;
        }

        const fingerprint = generateFingerprint(industry, rev, sde, price, state);

        if (sourceListingId) {
          const { data: existingBySource } = await supabase
            .from("deal_runs")
            .select("id")
            .eq("source_platform", source_platform)
            .eq("source_listing_id", sourceListingId)
            .limit(1)
            .single();
          if (existingBySource) { results.duplicates++; continue; }
        }

        const { data: existingByFingerprint } = await supabase
          .from("deal_runs").select("id").eq("fingerprint", fingerprint).limit(1).single();
        if (existingByFingerprint) { results.duplicates++; continue; }

        // Fetch RMA benchmarks for this industry (null = graceful fallback)
        const benchmarks = await fetchBenchmarksForIndustry(industry);

        // Normalize financials — compute usableSDE before scoring
        let normalized = null;
        let normPayload = {};
        let usableSDE = sde;
        try {
          const rawBm = benchmarks
            ? { ebitdaMarginPct: benchmarks.ebitda_margin_pct }
            : null;
          normalized = normalizeDealFinancials({
            revenue: rev, sde, ebitda: sde * 0.9, // ebitda approximated if not available
            price, benchmarkFamily: industry,
            classificationConfidence: null,
            benchmarkIsProxy: false,
            dataSource: "marketplace",
            rmaBenchmarks: rawBm,
          });
          usableSDE  = normalized.earnings.usableSDE;
          normPayload = buildNormalizationPayload(normalized);
        } catch { /* normalization is additive */ }

        // Score using usableSDE — not raw stated SDE
        const scores = scoreDeal({ industry, revenue: rev, sde: usableSDE, price, benchmarks });
        const confidence = getConfidenceScore(extracted.sdeSource, true, true);
        results.confidence[confidence]++;
        if (extracted.sdeSource === "estimated") results.estimated_sde++;

        // Generate score explanation bullets
        const explanation = generateScoreExplanation({
          industry, revenue: rev, sde: usableSDE,
          multiple: scores.multiple,
          dscr:     scores.dscr,
          benchmarks,
        });

        let clusterId: string | null = null;
        const { data: cluster } = await supabase.from("deal_clusters").select("id, runs_count, median_revenue, median_sde, median_price")
          .eq("industry", industry).gte("median_revenue", rev * 0.9).lte("median_revenue", rev * 1.1)
          .gte("median_sde", sde * 0.9).lte("median_sde", sde * 1.1)
          .gte("median_price", price * 0.9).lte("median_price", price * 1.1)
          .eq("is_active", true).order("last_seen", { ascending: false }).limit(1).single();

        if (cluster) {
          clusterId = cluster.id;
          const nc = cluster.runs_count + 1;
          await supabase.from("deal_clusters").update({
            runs_count: nc,
            median_revenue: Math.round((cluster.median_revenue * cluster.runs_count + rev) / nc),
            median_sde: Math.round((cluster.median_sde * cluster.runs_count + sde) / nc),
            median_price: Math.round((cluster.median_price * cluster.runs_count + price) / nc),
            median_multiple: scores.multiple, median_dscr: scores.dscr, median_score: scores.overallScore,
            last_seen: new Date().toISOString(),
          }).eq("id", clusterId);
        } else {
          const { data: nc } = await supabase.from("deal_clusters").insert({
            industry, state, median_revenue: rev, median_sde: sde, median_price: price,
            median_multiple: scores.multiple, median_dscr: scores.dscr, median_score: scores.overallScore,
            best_score: scores.overallScore, worst_score: scores.overallScore, runs_count: 1,
            unique_tools: ["marketplace_import"],
          }).select("id").single();
          clusterId = nc?.id || null;
        }

        await supabase.from("deal_runs").insert({
          tool_used: "marketplace_import",
          industry, revenue: rev, sde, asking_price: price,
          debt_percent: 80, interest_rate: 10.5, term_years: 10,
          city, state,
          employees: employees || null,
          years_in_business: yearEstablished ? new Date().getFullYear() - yearEstablished : null,
          valuation_multiple: scores.multiple, dscr: scores.dscr,
          monthly_payment: Math.round(scores.monthlyPayment),
          fair_value: scores.fairValue,
          overall_score: scores.overallScore, risk_level: scores.riskLevel,
          valuation_score: scores.valScore, debt_score: scores.debtScore,
          market_score: scores.marginScore, industry_score: 55,
          benchmark_source: scores.dataSource,
          score_explanation: explanation.bullets,
          fingerprint, cluster_id: clusterId, is_valid: true,
          red_flags: [], green_flags: [],
          source_platform,
          ...normPayload,
          source_url: sourceUrl,
          source_listing_id: sourceListingId,
          raw_data: row,
          confidence_score: confidence,
          data_source_type: "marketplace_supply",
          import_batch_id: batchId,
        });

        // Classification — fire-and-forget per deal
        try {
          const { data: ins } = await supabase
            .from("deal_runs").select("id")
            .eq("fingerprint", fingerprint)
            .order("created_at", { ascending: false })
            .limit(1).single();
          if (ins?.id) {
            applyDealClassification(ins.id).catch(() => {}); // non-fatal
          }
        } catch {}
  results.imported++;
      } catch (err) {
        results.errors++;
      }
    }

    // ── Refresh percentiles once after entire batch succeeds ──────────────────
    try {
      await supabase.rpc("refresh_deal_percentiles");
    } catch (e) {
      console.error("[bulk-import] percentile refresh failed:", e);
      // Non-fatal — percentiles will be stale until next successful import
    }

    return NextResponse.json({ success: true, results, batch_id: batchId });
  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
