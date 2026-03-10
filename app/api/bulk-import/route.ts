import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── INDUSTRY CLASSIFIER ────────────────────────────────────────────────────

const INDUSTRY_MAP: Record<string, string> = {
  // ── Original 18 industries
  laundromat: "laundromat", laundry: "laundromat", "coin laundry": "laundromat", "wash and fold": "laundromat", "dry clean": "laundromat", "dry cleaning": "laundromat",
  hvac: "hvac", heating: "hvac", "air conditioning": "hvac", "heating and cooling": "hvac", "hvac/r": "hvac", refrigeration: "hvac",
  landscaping: "landscaping", "lawn care": "landscaping", "lawn service": "landscaping", "lawn maintenance": "landscaping", "tree service": "landscaping", "tree care": "landscaping", "irrigation": "landscaping",
  "car wash": "carwash", carwash: "carwash", "auto wash": "carwash", "car detailing": "carwash", detailing: "carwash",
  dental: "dental", dentist: "dental", "dental practice": "dental", "dental office": "dental", orthodont: "dental",
  gym: "gym", fitness: "gym", "fitness center": "gym", "health club": "gym", crossfit: "gym", "yoga studio": "gym", pilates: "gym", "martial arts": "gym", boxing: "gym",
  restaurant: "restaurant", "food service": "restaurant", "bar and grill": "restaurant", cafe: "restaurant", "coffee shop": "restaurant", bakery: "restaurant", pizzeria: "restaurant", "fast food": "restaurant", catering: "restaurant", "food truck": "restaurant", brewery: "restaurant", "ice cream": "restaurant", "juice bar": "restaurant",
  "auto repair": "autorepair", "auto body": "autorepair", automotive: "autorepair", mechanic: "autorepair", "tire shop": "autorepair", transmission: "autorepair", "oil change": "autorepair", "auto glass": "autorepair",
  cleaning: "cleaning", janitorial: "cleaning", "maid service": "cleaning", "carpet cleaning": "cleaning", "pressure washing": "cleaning", "commercial cleaning": "cleaning", "window cleaning": "cleaning",
  ecommerce: "ecommerce", "e-commerce": "ecommerce", "online store": "ecommerce", amazon: "ecommerce", shopify: "ecommerce", fba: "ecommerce", dropship: "ecommerce", "online retail": "ecommerce",
  saas: "saas", software: "saas", "software platform": "saas",
  insurance: "insurance", "insurance agency": "insurance", "insurance broker": "insurance",
  plumbing: "plumbing", plumber: "plumbing", drain: "plumbing", "water heater": "plumbing",
  roofing: "roofing", roofer: "roofing", roof: "roofing", siding: "roofing",
  "pet care": "petcare", "pet grooming": "petcare", "dog grooming": "petcare", veterinary: "petcare", "pet sitting": "petcare", kennel: "petcare", "doggy daycare": "petcare", "pet supply": "petcare", "pet store": "petcare",
  pharmacy: "pharmacy", "drug store": "pharmacy", compounding: "pharmacy",
  daycare: "daycare", childcare: "daycare", preschool: "daycare", "child care": "daycare", "learning center": "daycare", "montessori": "daycare", "after school": "daycare",
  "med spa": "medspa", medspa: "medspa", aesthetics: "medspa", "medical spa": "medspa", botox: "medspa", laser: "medspa", "cosmetic": "medspa", dermatology: "medspa",

  // ── NEW: Accounting & Tax (huge ETA category)
  accounting: "accounting", "accounting firm": "accounting", "tax firm": "accounting", "tax preparation": "accounting", "tax service": "accounting",
  bookkeeping: "accounting", cpa: "accounting", "cpa firm": "accounting", "financial services": "accounting", "tax accounting": "accounting",
  "tax & accounting": "accounting", "accounting & consulting": "accounting", "accounting & tax": "accounting", "tax return": "accounting",

  // ── NEW: Electrical
  electrical: "electrical", electrician: "electrical", "electrical contractor": "electrical", "electrical service": "electrical",
  "electrical company": "electrical", wiring: "electrical",

  // ── NEW: Healthcare
  "home healthcare": "healthcare", "home health": "healthcare", "healthcare staffing": "healthcare", "medical staffing": "healthcare",
  "physical therapy": "healthcare", "occupational therapy": "healthcare", "speech therapy": "healthcare", "therapy practice": "healthcare",
  "urgent care": "healthcare", clinic: "healthcare", "medical practice": "healthcare", "medical clinic": "healthcare",
  "home care": "healthcare", "senior care": "healthcare", "elder care": "healthcare", "assisted living": "healthcare",
  "mental health": "healthcare", counseling: "healthcare", "behavioral health": "healthcare", chiropractic: "healthcare", chiropractor: "healthcare",
  "staffing agency": "healthcare", "nurse staffing": "healthcare", hospice: "healthcare",

  // ── NEW: Transportation & Logistics
  transportation: "transportation", trucking: "transportation", logistics: "transportation", freight: "transportation",
  "moving company": "transportation", moving: "transportation", courier: "transportation", delivery: "transportation",
  "freight broker": "transportation", hauling: "transportation", "dump truck": "transportation", towing: "transportation",
  "limo": "transportation", "limousine": "transportation", "shuttle": "transportation", "charter": "transportation",

  // ── NEW: Printing & Marketing
  printing: "printing", "print shop": "printing", "print & marketing": "printing", "b2b print": "printing",
  "marketing services": "printing", "marketing agency": "printing", "digital marketing": "printing", "sign shop": "printing",
  "promotional products": "printing", "graphic design": "printing", signage: "printing", "screen printing": "printing",
  "print/marketing": "printing",

  // ── NEW: Self-Storage
  "self storage": "storage", "self-storage": "storage", storage: "storage", "storage facility": "storage",
  "mini storage": "storage", "storage solutions": "storage", "rv storage": "storage", "boat storage": "storage",
  warehouse: "storage",

  // ── NEW: Painting
  painting: "painting", painter: "painting", "painting company": "painting", "painting contractor": "painting",
  "residential painting": "painting", "commercial painting": "painting", "paint contractor": "painting",

  // ── NEW: Security
  "security services": "security", security: "security", "alarm company": "security", "alarm system": "security",
  "security guard": "security", "security company": "security", surveillance: "security", "fire protection": "security",
  "fire alarm": "security",

  // ── Catch-all mappings for borderline categories
  consulting: "accounting", "engineering services": "electrical",
  "home improvement": "roofing", "general contractor": "roofing", "construction": "roofing",
  "garage improvement": "autorepair", "auto dealership": "autorepair", "auto salvage": "autorepair",
  "food route": "restaurant", "food distribution": "restaurant", "beverage distribution": "restaurant", beverage: "restaurant",
  franchise: "restaurant", "vending": "restaurant",
  "waste management": "cleaning", "junk removal": "cleaning", "dumpster": "cleaning",
  app: "saas", platform: "saas", subscription: "saas",
};

const INDUSTRY_MARGINS: Record<string, [number, number]> = {
  laundromat: [25, 40], hvac: [15, 30], landscaping: [10, 25], carwash: [25, 45],
  dental: [20, 40], gym: [15, 35], restaurant: [5, 15], autorepair: [15, 30],
  cleaning: [15, 30], ecommerce: [15, 35], saas: [60, 85], insurance: [20, 40],
  plumbing: [15, 30], roofing: [15, 30], petcare: [20, 40], pharmacy: [18, 30],
  daycare: [15, 30], medspa: [25, 45],
  // New industries
  accounting: [30, 55], electrical: [15, 30], healthcare: [15, 35],
  transportation: [10, 25], printing: [15, 30], storage: [40, 65],
  painting: [15, 30], security: [15, 30],
};

const MULTIPLES: Record<string, [number, number]> = {
  laundromat: [2.5, 4.0], hvac: [2.5, 4.5], landscaping: [1.5, 3.0], carwash: [3.0, 5.0],
  dental: [3.0, 5.5], gym: [2.0, 4.0], restaurant: [1.5, 3.0], autorepair: [2.0, 3.5],
  cleaning: [1.5, 3.0], ecommerce: [2.5, 4.5], saas: [3.0, 6.0], insurance: [2.0, 3.5],
  plumbing: [2.0, 4.0], roofing: [1.5, 3.5], petcare: [2.0, 4.0], pharmacy: [2.5, 4.0],
  daycare: [2.0, 4.0], medspa: [3.0, 5.0],
  // New industries
  accounting: [1.5, 3.5],   // Recurring revenue makes these valuable
  electrical: [2.0, 4.0],   // Similar to HVAC/plumbing trades
  healthcare: [3.0, 6.0],   // High margins, recurring patients
  transportation: [2.0, 4.0], // Asset-heavy but steady
  printing: [1.5, 3.0],     // Declining but cash-flowing
  storage: [4.0, 8.0],      // Premium asset, very stable income
  painting: [1.5, 3.0],     // Low barrier, service-based
  security: [2.5, 4.5],     // Recurring monitoring contracts
};

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

  // SDE extraction with source tracking
  let sde: number | null = null;
  let sdeSource: FieldExtraction["sdeSource"] = "none";

  // Priority 1: Direct SDE
  const directSDE = parseNumber(row.sde || row.SDE || row["Seller's Discretionary Earnings"] || row["Owner Benefit"]);
  if (directSDE) { sde = directSDE; sdeSource = "direct_sde"; }

  // Priority 2: Cash Flow
  if (!sde) {
    const cashFlow = parseNumber(row.cash_flow || row["Cash Flow"] || row["Discretionary Cash Flow"]);
    if (cashFlow) { sde = cashFlow; sdeSource = "cash_flow"; }
  }

  // Priority 3: Profit / Net Profit
  if (!sde) {
    const profit = parseNumber(row.profit || row.Profit || row["Net Profit"] || row["Net Income"]);
    if (profit) { sde = profit; sdeSource = "profit"; }
  }

  // Priority 4: Estimate from revenue × industry margin midpoint
  if (!sde && revenue && industry) {
    const margins = INDUSTRY_MARGINS[industry];
    if (margins) {
      const midMargin = (margins[0] + margins[1]) / 2 / 100;
      sde = Math.round(revenue * midMargin);
      sdeSource = "estimated";
    }
  }

  return { revenue, sde, price, sdeSource };
}

function getConfidenceScore(sdeSource: FieldExtraction["sdeSource"], hasRevenue: boolean, hasPrice: boolean): "high" | "medium" | "low" {
  if (sdeSource === "direct_sde" && hasRevenue && hasPrice) return "high";
  if ((sdeSource === "cash_flow" || sdeSource === "profit") && hasRevenue && hasPrice) return "medium";
  return "low";
}

// ─── SCORING ─────────────────────────────────────────────────────────────────

function scoreDeal(industry: string, revenue: number, sde: number, price: number) {
  const [lowM, highM] = MULTIPLES[industry] || [2.0, 4.0];
  const midM = (lowM + highM) / 2;
  const multiple = +(price / sde).toFixed(2);

  let valScore = multiple <= midM ? Math.min(95, 70 + (midM - multiple) / midM * 50)
    : multiple <= highM ? 70 - ((multiple - midM) / (highM - midM)) * 30
    : Math.max(5, 40 - ((multiple - highM) / highM) * 60);
  valScore = Math.round(Math.max(5, Math.min(98, valScore)));

  const debtPct = 0.80, rate = 0.105, term = 10;
  const loanAmount = price * debtPct;
  const monthlyRate = rate / 12;
  const numPayments = term * 12;
  const monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  const annualPayment = monthlyPayment * 12;
  const dscr = +(sde / annualPayment).toFixed(2);

  let debtScore = dscr >= 2.0 ? 92 : dscr >= 1.5 ? 75 + (dscr - 1.5) * 34
    : dscr >= 1.25 ? 55 + (dscr - 1.25) * 80 : dscr >= 1.0 ? 30 + (dscr - 1.0) * 100
    : Math.max(5, dscr * 30);
  debtScore = Math.round(Math.max(5, Math.min(98, debtScore)));

  const overallScore = Math.round(valScore * 0.4 + debtScore * 0.4 + 55 * 0.2);
  const riskLevel = overallScore >= 70 ? "Low" : overallScore >= 50 ? "Moderate" : overallScore >= 30 ? "High" : "Critical";
  const fairValue = Math.round(sde * midM);

  return { multiple, dscr, monthlyPayment, annualPayment, fairValue, valScore, debtScore, overallScore, riskLevel };
}

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
        // Extract source tracking fields
        const sourceUrl = row.source_url || row.url || row.URL || row.Link || row.link || null;
        const sourceListingId = row.listing_id || row.id || row.ID || null;

        // Classify industry from multiple fields
        const industryText = String(row.industry || row.Industry || row.category || row.Category || row.type || row.Type || row.title || row.Title || row.name || row.Name || "");
        const titleText = String(row.title || row.Title || row.name || row.Name || "");
        const industry = classifyIndustry(industryText) || classifyIndustry(titleText);

        if (!industry) {
          results.skipped_industry++;
          results.rejections.push({ row: idx + 1, reason: "unknown_industry", details: `Could not classify "${industryText.slice(0, 60)}"`, industry: industryText.slice(0, 40) });
          // Log rejection
          await supabase.from("import_rejections").insert({
            source_platform, source_url: sourceUrl, source_listing_id: sourceListingId,
            raw_data: row, extracted_industry: industryText.slice(0, 100),
            rejection_reason: "unknown_industry",
            rejection_details: `Industry text "${industryText.slice(0, 80)}" did not match any tracked industry`,
            import_batch_id: batchId,
          }).then();
          continue;
        }

        // Extract fields with confidence tracking
        const extracted = extractFields(row, industry);
        const location = String(row.location || row.Location || row.city || row.City || "");
        const state = parseState(location);
        const city = parseCity(location);
        const employees = parseNumber(row.employees || row.Employees || row["Number of Employees"]);
        const yearEstablished = parseNumber(row.year_established || row["Year Established"] || row.established || row.Founded);

        // Check missing critical fields
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

        // Threshold check
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

        // Dedup: check fingerprint AND source_listing_id
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

        // Score the deal
        const scores = scoreDeal(industry, rev, sde, price);
        const confidence = getConfidenceScore(extracted.sdeSource, true, true);
        results.confidence[confidence]++;
        if (extracted.sdeSource === "estimated") results.estimated_sde++;

        // Find or create cluster
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

        // Insert deal run with all enhanced fields
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
          market_score: 55, industry_score: 55,
          fingerprint, cluster_id: clusterId, is_valid: true,
          red_flags: [], green_flags: [],
          // Enhanced fields
          source_platform,
          source_url: sourceUrl,
          source_listing_id: sourceListingId,
          raw_data: row,
          confidence_score: confidence,
          data_source_type: "marketplace_supply",
          import_batch_id: batchId,
        });

        results.imported++;
      } catch (err) {
        results.errors++;
      }
    }

    return NextResponse.json({ success: true, results, batch_id: batchId });
  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
