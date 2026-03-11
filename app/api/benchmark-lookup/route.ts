import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── SIZE BAND HELPER ────────────────────────────────────────────────────────

function getSizeBand(revenue: number): string {
  if (revenue < 500000) return "under_500k";
  if (revenue < 1000000) return "500k_1m";
  if (revenue < 3000000) return "1m_3m";
  if (revenue < 10000000) return "3m_10m";
  return "10m_plus";
}

// ─── HARDCODED FALLBACKS (Tier 5 — always available) ─────────────────────────

const HARDCODED: Record<string, { multipleRange: [number, number]; marginRange: [number, number] }> = {
  laundromat: { multipleRange: [2.5, 4.0], marginRange: [25, 40] },
  hvac: { multipleRange: [2.5, 4.5], marginRange: [15, 30] },
  landscaping: { multipleRange: [1.5, 3.0], marginRange: [10, 25] },
  carwash: { multipleRange: [3.0, 5.0], marginRange: [25, 45] },
  dental: { multipleRange: [3.0, 5.5], marginRange: [20, 40] },
  gym: { multipleRange: [2.0, 4.0], marginRange: [15, 35] },
  restaurant: { multipleRange: [1.5, 3.0], marginRange: [5, 15] },
  autorepair: { multipleRange: [2.0, 3.5], marginRange: [15, 30] },
  cleaning: { multipleRange: [1.5, 3.0], marginRange: [15, 30] },
  ecommerce: { multipleRange: [2.5, 4.5], marginRange: [15, 35] },
  saas: { multipleRange: [3.0, 6.0], marginRange: [60, 85] },
  insurance: { multipleRange: [2.0, 3.5], marginRange: [20, 40] },
  plumbing: { multipleRange: [2.0, 4.0], marginRange: [15, 30] },
  roofing: { multipleRange: [1.5, 3.5], marginRange: [15, 30] },
  petcare: { multipleRange: [2.0, 4.0], marginRange: [20, 40] },
  pharmacy: { multipleRange: [2.5, 4.0], marginRange: [18, 30] },
  daycare: { multipleRange: [2.0, 4.0], marginRange: [15, 30] },
  medspa: { multipleRange: [3.0, 5.0], marginRange: [25, 45] },
  accounting: { multipleRange: [1.5, 3.5], marginRange: [30, 55] },
  electrical: { multipleRange: [2.0, 4.0], marginRange: [15, 30] },
  healthcare: { multipleRange: [3.0, 6.0], marginRange: [15, 35] },
  transportation: { multipleRange: [2.0, 4.0], marginRange: [10, 25] },
  printing: { multipleRange: [1.5, 3.0], marginRange: [15, 30] },
  storage: { multipleRange: [4.0, 8.0], marginRange: [40, 65] },
  painting: { multipleRange: [1.5, 3.0], marginRange: [15, 30] },
  security: { multipleRange: [2.5, 4.5], marginRange: [15, 30] },
};

// ─── CONFIDENCE SCORING ──────────────────────────────────────────────────────

type ConfidenceGrade = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
type MatchLevel = "industry_state_sizeband" | "industry_national_sizeband" | "industry_state" | "industry_national" | "hardcoded";

interface LensConfidence {
  grade: ConfidenceGrade;
  weight: number;
  sampleSize: number;
  matchLevel: MatchLevel;
  source: string;
  description: string;
}

function computeConfidence(sampleSize: number, matchLevel: MatchLevel, monthsOld: number): { grade: ConfidenceGrade; weight: number } {
  let score = 0;

  // Sample size (0-40)
  if (sampleSize >= 50) score += 40;
  else if (sampleSize >= 15) score += 25;
  else if (sampleSize >= 5) score += 10;
  else return { grade: "INSUFFICIENT", weight: 0 };

  // Freshness (0-30)
  if (monthsOld <= 6) score += 30;
  else if (monthsOld <= 18) score += 20;
  else if (monthsOld <= 36) score += 10;

  // Match quality (0-30)
  const matchScores: Record<MatchLevel, number> = {
    industry_state_sizeband: 30,
    industry_national_sizeband: 25,
    industry_state: 20,
    industry_national: 15,
    hardcoded: 5,
  };
  score += matchScores[matchLevel];

  if (score >= 75) return { grade: "HIGH", weight: 1.0 };
  if (score >= 50) return { grade: "MEDIUM", weight: 0.75 };
  if (score >= 25) return { grade: "LOW", weight: 0.5 };
  return { grade: "INSUFFICIENT", weight: 0 };
}

// ─── LISTING BENCHMARK LOOKUP (5-tier fallback) ──────────────────────────────

interface ListingBenchmark {
  median_asking_price: number;
  median_revenue: number;
  median_sde: number;
  median_multiple: number;
  p25_multiple: number;
  p75_multiple: number;
  sample_size: number;
  median_deal_score: number;
}

async function getListingBenchmark(
  industry: string, state: string | null, revenue: number
): Promise<{ data: ListingBenchmark | null; matchLevel: MatchLevel; sampleSize: number }> {
  const sizeBand = getSizeBand(revenue);

  // Tier 1: industry + state + size_band
  if (state) {
    const { data } = await supabase.from("industry_listing_benchmarks")
      .select("*").eq("industry_key", industry).eq("state", state).eq("size_band", sizeBand).single();
    if (data && data.sample_size >= 5) return { data, matchLevel: "industry_state_sizeband", sampleSize: data.sample_size };
  }

  // Tier 2: industry + national + size_band
  const { data: t2 } = await supabase.from("industry_listing_benchmarks")
    .select("*").eq("industry_key", industry).is("state", null).eq("size_band", sizeBand).single();
  if (t2 && t2.sample_size >= 5) return { data: t2, matchLevel: "industry_national_sizeband", sampleSize: t2.sample_size };

  // Tier 3: industry + state (any size)
  if (state) {
    const { data: t3 } = await supabase.from("industry_listing_benchmarks")
      .select("*").eq("industry_key", industry).eq("state", state).is("size_band", null).single();
    if (t3 && t3.sample_size >= 5) return { data: t3, matchLevel: "industry_state", sampleSize: t3.sample_size };
  }

  // Tier 4: industry + national (any size)
  const { data: t4 } = await supabase.from("industry_listing_benchmarks")
    .select("*").eq("industry_key", industry).is("state", null).is("size_band", null).single();
  if (t4 && t4.sample_size >= 3) return { data: t4, matchLevel: "industry_national", sampleSize: t4.sample_size };

  return { data: null, matchLevel: "hardcoded", sampleSize: 0 };
}

// ─── TRANSACTION BENCHMARK LOOKUP ────────────────────────────────────────────

interface TransactionBenchmark {
  median_sale_price: number;
  median_asking_price: number;
  sale_to_asking_ratio: number;
  median_revenue: number;
  median_cash_flow: number;
  cashflow_multiple_avg: number;
  median_days_on_market: number;
  reported_sales: number;
  subsector: string;
}

async function getTransactionBenchmark(
  industry: string
): Promise<{ data: TransactionBenchmark | null; matchLevel: MatchLevel; sampleSize: number }> {
  // Tier 1: exact industry_key match — aggregate all subsectors for this industry
  const { data: rows } = await supabase.from("industry_transaction_benchmarks")
    .select("*").eq("industry_key", industry).order("reported_sales", { ascending: false });

  if (rows && rows.length > 0) {
    const totalSales = rows.reduce((s: number, r: Record<string, number>) => s + (r.reported_sales || 0), 0);

    if (totalSales >= 5) {
      // Weighted average by reported_sales for the aggregated benchmark
      const weightedAvg = (field: string) => {
        let sum = 0, wt = 0;
        rows.forEach((r: Record<string, number>) => {
          if (r[field] != null && r.reported_sales > 0) {
            sum += r[field] * r.reported_sales;
            wt += r.reported_sales;
          }
        });
        return wt > 0 ? sum / wt : null;
      };

      // Use the largest subsector as the primary for single-value fields
      const primary = rows[0];

      return {
        data: {
          median_sale_price: weightedAvg("median_sale_price") || primary.median_sale_price,
          median_asking_price: weightedAvg("median_asking_price") || primary.median_asking_price,
          sale_to_asking_ratio: weightedAvg("sale_to_asking_ratio") || primary.sale_to_asking_ratio,
          median_revenue: weightedAvg("median_revenue") || primary.median_revenue,
          median_cash_flow: weightedAvg("median_cash_flow") || primary.median_cash_flow,
          cashflow_multiple_avg: weightedAvg("cashflow_multiple_avg") || primary.cashflow_multiple_avg,
          median_days_on_market: Math.round(weightedAvg("median_days_on_market") || primary.median_days_on_market),
          reported_sales: totalSales,
          subsector: rows.length === 1 ? primary.subsector : `${rows.length} subsectors`,
        },
        matchLevel: "industry_national",
        sampleSize: totalSales,
      };
    }
  }

  return { data: null, matchLevel: "hardcoded", sampleSize: 0 };
}

// ─── FINANCIAL BENCHMARK LOOKUP (RMA) ────────────────────────────────────────

interface FinancialBenchmark {
  median_sde_margin: number;
  median_operating_margin: number;
  median_net_margin: number;
  median_revenue_per_employee: number;
  median_current_ratio: number;
  company_size_band: string;
}

async function getFinancialBenchmark(
  industry: string, revenue: number
): Promise<{ data: FinancialBenchmark | null; matchLevel: MatchLevel; sampleSize: number }> {
  const sizeBand = getSizeBand(revenue);

  // Tier 1: industry + exact size_band
  const { data: t1 } = await supabase.from("industry_financial_benchmarks")
    .select("*").eq("industry_key", industry).eq("company_size_band", sizeBand).single();
  if (t1) return { data: t1, matchLevel: "industry_national_sizeband", sampleSize: 1 };

  // Tier 2: industry + any size_band (broadest)
  const { data: t2 } = await supabase.from("industry_financial_benchmarks")
    .select("*").eq("industry_key", industry).limit(1).single();
  if (t2) return { data: t2, matchLevel: "industry_national", sampleSize: 1 };

  return { data: null, matchLevel: "hardcoded", sampleSize: 0 };
}

// ─── DYNAMIC WEIGHT ADJUSTMENT ───────────────────────────────────────────────

interface AdjustedWeights {
  valuation: number;
  debt: number;
  financial: number;
  liquidity: number;
}

function adjustWeights(
  listingConf: LensConfidence,
  transactionConf: LensConfidence,
  financialConf: LensConfidence
): AdjustedWeights {
  // Base weights
  let valuation = 35, debt = 30, financial = 20, liquidity = 15;

  // If financial lens is insufficient, redistribute
  if (financialConf.grade === "INSUFFICIENT") {
    valuation += 8;
    debt += 7;
    liquidity += 5;
    financial = 0;
  } else if (financialConf.grade === "LOW") {
    const reduction = 10;
    financial -= reduction;
    valuation += 4;
    debt += 3;
    liquidity += 3;
  }

  // If transaction data is thin, reduce liquidity weight
  if (transactionConf.grade === "INSUFFICIENT") {
    valuation += Math.round(liquidity * 0.5);
    debt += Math.round(liquidity * 0.5);
    liquidity = 0;
  } else if (transactionConf.grade === "LOW") {
    const reduction = 7;
    liquidity -= reduction;
    valuation += 3;
    debt += 4;
  }

  // Normalize to 100
  const total = valuation + debt + financial + liquidity;
  return {
    valuation: Math.round(valuation / total * 100),
    debt: Math.round(debt / total * 100),
    financial: Math.round(financial / total * 100),
    liquidity: Math.round(liquidity / total * 100),
  };
}

// ─── MAIN API HANDLER ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { industry, state, revenue, sde, asking_price } = body;

    if (!industry || !revenue || !sde || !asking_price) {
      return NextResponse.json({ error: "industry, revenue, sde, and asking_price are required" }, { status: 400 });
    }

    const multiple = +(asking_price / sde).toFixed(2);
    const sdeMargin = +((sde / revenue) * 100).toFixed(1);
    const hardcoded = HARDCODED[industry] || HARDCODED.cleaning;

    // ── Fetch all three lenses in parallel
    const [listingResult, transactionResult, financialResult] = await Promise.all([
      getListingBenchmark(industry, state, revenue),
      getTransactionBenchmark(industry),
      getFinancialBenchmark(industry, revenue),
    ]);

    // ── Build confidence for each lens
    const listingConfidence: LensConfidence = {
      ...computeConfidence(listingResult.sampleSize, listingResult.matchLevel, 1),
      sampleSize: listingResult.sampleSize,
      matchLevel: listingResult.matchLevel,
      source: "listing_benchmarks",
      description: listingResult.data
        ? `${listingResult.sampleSize} active ${industry} listings${state && listingResult.matchLevel.includes("state") ? ` in ${state}` : " nationally"}`
        : "Using hardcoded industry defaults",
    };

    const transactionConfidence: LensConfidence = {
      ...computeConfidence(transactionResult.sampleSize, transactionResult.matchLevel, 3),
      sampleSize: transactionResult.sampleSize,
      matchLevel: transactionResult.matchLevel,
      source: "transaction_benchmarks",
      description: transactionResult.data
        ? `${transactionResult.sampleSize.toLocaleString()} closed ${transactionResult.data.subsector} sales (2025)`
        : "No transaction data available",
    };

    const financialConfidence: LensConfidence = {
      ...computeConfidence(financialResult.sampleSize, financialResult.matchLevel, 12),
      sampleSize: financialResult.sampleSize,
      matchLevel: financialResult.matchLevel,
      source: "financial_benchmarks",
      description: financialResult.data
        ? `RMA ${financialResult.data.company_size_band} revenue band`
        : "RMA data not yet loaded",
    };

    // ── Compute adjusted weights
    const weights = adjustWeights(listingConfidence, transactionConfidence, financialConfidence);

    // ── Overall confidence
    const grades = [listingConfidence.grade, transactionConfidence.grade, financialConfidence.grade];
    const highCount = grades.filter((g) => g === "HIGH").length;
    const insuffCount = grades.filter((g) => g === "INSUFFICIENT").length;
    const overallConfidence: ConfidenceGrade =
      highCount >= 2 ? "HIGH" : insuffCount >= 2 ? "LOW" : "MEDIUM";

    // ── Build benchmark comparison data
    const listing = listingResult.data;
    const txn = transactionResult.data;
    const fin = financialResult.data;

    // Effective multiple range: prefer transaction data, fall back to listing, then hardcoded
    const effectiveMultipleRange: [number, number] = txn
      ? [+(txn.cashflow_multiple_avg * 0.75).toFixed(2), +(txn.cashflow_multiple_avg * 1.25).toFixed(2)]
      : listing
        ? [+(listing.p25_multiple || hardcoded.multipleRange[0]).toFixed(2), +(listing.p75_multiple || hardcoded.multipleRange[1]).toFixed(2)]
        : hardcoded.multipleRange;

    const effectiveFairValue = txn
      ? Math.round(sde * txn.cashflow_multiple_avg)
      : listing
        ? Math.round(sde * listing.median_multiple)
        : Math.round(sde * (hardcoded.multipleRange[0] + hardcoded.multipleRange[1]) / 2);

    // Seller-buyer gap
    const sellerBuyerGap = listing && txn
      ? +((listing.median_multiple - txn.cashflow_multiple_avg) / txn.cashflow_multiple_avg * 100).toFixed(1)
      : null;

    // Sale-to-ask ratio
    const saleToAsk = txn?.sale_to_asking_ratio || null;

    // Estimated negotiated price
    const estimatedNegotiatedPrice = saleToAsk ? Math.round(asking_price * saleToAsk) : null;

    // Smart offer range (using negotiation logic from offer fix)
    let smartOfferLow: number, smartOfferHigh: number;
    if (asking_price <= effectiveFairValue * 0.85) {
      smartOfferLow = Math.round(asking_price * 0.80);
      smartOfferHigh = Math.round(asking_price * 1.0);
    } else if (asking_price <= effectiveFairValue) {
      smartOfferLow = Math.round(asking_price * 0.85);
      smartOfferHigh = Math.round(asking_price * 1.0);
    } else if (asking_price <= effectiveFairValue * 1.15) {
      smartOfferLow = Math.round(effectiveFairValue * 0.90);
      smartOfferHigh = effectiveFairValue;
    } else {
      smartOfferLow = Math.round(effectiveFairValue * 0.85);
      smartOfferHigh = effectiveFairValue;
    }

    // Financial quality vs RMA
    const financialQuality = fin?.median_sde_margin
      ? { dealMargin: sdeMargin, industryMedian: fin.median_sde_margin, aboveAverage: sdeMargin > fin.median_sde_margin }
      : { dealMargin: sdeMargin, industryMedian: (hardcoded.marginRange[0] + hardcoded.marginRange[1]) / 2, aboveAverage: sdeMargin > (hardcoded.marginRange[0] + hardcoded.marginRange[1]) / 2 };

    return NextResponse.json({
      success: true,

      // ── Three-lens benchmark data
      benchmarks: {
        listing: listing ? {
          medianMultiple: listing.median_multiple,
          medianAskingPrice: listing.median_asking_price,
          medianRevenue: listing.median_revenue,
          medianSDE: listing.median_sde,
          p25Multiple: listing.p25_multiple,
          p75Multiple: listing.p75_multiple,
          sampleSize: listing.sample_size,
        } : null,

        transaction: txn ? {
          medianSalePrice: txn.median_sale_price,
          medianAskingPrice: txn.median_asking_price,
          saleToAskRatio: txn.sale_to_asking_ratio,
          cashflowMultiple: txn.cashflow_multiple_avg,
          medianRevenue: txn.median_revenue,
          medianCashFlow: txn.median_cash_flow,
          daysOnMarket: txn.median_days_on_market,
          reportedSales: txn.reported_sales,
          subsector: txn.subsector,
        } : null,

        financial: fin ? {
          sdeMargin: fin.median_sde_margin,
          operatingMargin: fin.median_operating_margin,
          netMargin: fin.median_net_margin,
          revenuePerEmployee: fin.median_revenue_per_employee,
          currentRatio: fin.median_current_ratio,
          sizeBand: fin.company_size_band,
        } : null,
      },

      // ── Computed analysis
      analysis: {
        dealMultiple: multiple,
        dealSdeMargin: sdeMargin,
        effectiveMultipleRange,
        effectiveFairValue,
        smartOfferRange: [smartOfferLow, smartOfferHigh],
        estimatedNegotiatedPrice,
        sellerBuyerGap,
        saleToAskRatio: saleToAsk,
        financialQuality,
        daysOnMarket: txn?.median_days_on_market || null,
      },

      // ── Confidence
      confidence: {
        overall: overallConfidence,
        listing: listingConfidence,
        transaction: transactionConfidence,
        financial: financialConfidence,
        weights,
      },

      // ── Hardcoded fallback (always available for backward compat)
      hardcoded: {
        multipleRange: hardcoded.multipleRange,
        marginRange: hardcoded.marginRange,
      },
    });
  } catch (error) {
    console.error("Benchmark lookup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
