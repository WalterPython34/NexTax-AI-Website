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
// Preserved exactly from original — this logic is sound.

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
  if (sampleSize >= 50) score += 40;
  else if (sampleSize >= 15) score += 25;
  else if (sampleSize >= 5) score += 10;
  else return { grade: "INSUFFICIENT", weight: 0 };
  if (monthsOld <= 6) score += 30;
  else if (monthsOld <= 18) score += 20;
  else if (monthsOld <= 36) score += 10;
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

// ─── LISTING BENCHMARK LOOKUP (5-tier fallback) ───────────────────────────────
// Preserved exactly from original — no changes.

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

  if (state) {
    const { data } = await supabase.from("industry_listing_benchmarks")
      .select("*").eq("industry_key", industry).eq("state", state).eq("size_band", sizeBand).single();
    if (data && data.sample_size >= 5) return { data, matchLevel: "industry_state_sizeband", sampleSize: data.sample_size };
  }

  const { data: t2 } = await supabase.from("industry_listing_benchmarks")
    .select("*").eq("industry_key", industry).is("state", null).eq("size_band", sizeBand).single();
  if (t2 && t2.sample_size >= 5) return { data: t2, matchLevel: "industry_national_sizeband", sampleSize: t2.sample_size };

  if (state) {
    const { data: t3 } = await supabase.from("industry_listing_benchmarks")
      .select("*").eq("industry_key", industry).eq("state", state).is("size_band", null).single();
    if (t3 && t3.sample_size >= 5) return { data: t3, matchLevel: "industry_state", sampleSize: t3.sample_size };
  }

  const { data: t4 } = await supabase.from("industry_listing_benchmarks")
    .select("*").eq("industry_key", industry).is("state", null).is("size_band", null).single();
  if (t4 && t4.sample_size >= 3) return { data: t4, matchLevel: "industry_national", sampleSize: t4.sample_size };

  return { data: null, matchLevel: "hardcoded", sampleSize: 0 };
}

// ─── TRANSACTION BENCHMARK LOOKUP ────────────────────────────────────────────
// UPDATED: Now queries DealStats first (primary valuation source), then
// BizBuySell for market-activity metrics only (sale-to-ask, days-on-market).
//
// DealStats provides:  median MVIC/SDE multiple, p25/p75 range, margins
// BizBuySell provides: sale-to-asking ratio, days on market, reported sales count
//
// cashflowMultiple in the response now comes from DealStats when available.
// BizBuySell metrics are preserved for negotiation context (never replaced).

interface DStatsRow {
  industry_key: string;
  size_band: string | null;
  sample_size: number;
  median_mvic_to_sde: number | null;
  median_mvic_to_revenue: number | null;
  p25_mvic_to_sde: number | null;
  p75_mvic_to_sde: number | null;
  median_mvic: number | null;
  median_sde: number | null;
  median_revenue: number | null;
  median_sde_margin: number | null;
  median_ebitda_margin: number | null;
  median_operating_margin: number | null;
}

interface TransactionBenchmark {
  median_sale_price: number;
  median_asking_price: number;
  sale_to_asking_ratio: number;
  median_revenue: number;
  median_cash_flow: number;
  // PRIMARY VALUATION MULTIPLE — now DealStats-preferred:
  cashflow_multiple_avg: number;
  // Range (from DealStats p25/p75 when available):
  p25_multiple: number | null;
  p75_multiple: number | null;
  median_days_on_market: number;
  reported_sales: number;
  subsector: string;
  // Source tracking — never shown to users, used for confidence label
  multiple_source: "dstats_band" | "dstats_national" | "bizbuysell";
  dstats_sample_size: number;
  // Margin benchmarks from DealStats (for financial lens)
  median_sde_margin: number | null;
}

async function getTransactionBenchmark(
  industry: string,
  revenue: number
): Promise<{ data: TransactionBenchmark | null; matchLevel: MatchLevel; sampleSize: number }> {
  const sizeBand = getSizeBand(revenue);

  // ── Fetch DealStats and BizBuySell in parallel
  const [dstatsRes, bbRes] = await Promise.all([
    supabase.from("dealstats_benchmarks")
      .select("industry_key, size_band, sample_size, median_mvic_to_sde, median_mvic_to_revenue, p25_mvic_to_sde, p75_mvic_to_sde, median_mvic, median_sde, median_revenue, median_sde_margin, median_ebitda_margin, median_operating_margin")
      .eq("industry_key", industry),
    supabase.from("industry_transaction_benchmarks")
      .select("*")
      .eq("industry_key", industry)
      .order("reported_sales", { ascending: false }),
  ]);

  const dstatsRows: DStatsRow[] = dstatsRes.data || [];
  const bbRows: any[] = bbRes.data || [];

  // ── Organize DealStats rows
  const dstatsBand = dstatsRows.find((r) => r.size_band === sizeBand);
  const dstatsNational = dstatsRows.find((r) => !r.size_band);

  // ── Pick best DealStats multiple (size-band preferred, min 5 samples)
  let dstatsMultiple: number | null = null;
  let dstatsP25: number | null = null;
  let dstatsP75: number | null = null;
  let dstatsSampleSize = 0;
  let dstatsSource: "dstats_band" | "dstats_national" | "bizbuysell" = "bizbuysell";

  if (dstatsBand && dstatsBand.sample_size >= 5 && dstatsBand.median_mvic_to_sde) {
    dstatsMultiple = dstatsBand.median_mvic_to_sde;
    dstatsP25 = dstatsBand.p25_mvic_to_sde;
    dstatsP75 = dstatsBand.p75_mvic_to_sde;
    dstatsSampleSize = dstatsBand.sample_size;
    dstatsSource = "dstats_band";
  } else if (dstatsNational && dstatsNational.sample_size >= 10 && dstatsNational.median_mvic_to_sde) {
    dstatsMultiple = dstatsNational.median_mvic_to_sde;
    dstatsP25 = dstatsNational.p25_mvic_to_sde;
    dstatsP75 = dstatsNational.p75_mvic_to_sde;
    dstatsSampleSize = dstatsNational.sample_size;
    dstatsSource = "dstats_national";
  }

  // ── BizBuySell — used for sale-to-ask ratio, days on market, reported sales count
  // These market-activity metrics are only in BizBuySell; DealStats doesn't have them.
  let bbSales = 0, bbMultiple: number | null = null, bbSaleToAsk: number | null = null;
  let bbDaysOnMarket: number | null = null, bbMedianSalePrice: number | null = null;
  let bbMedianAskingPrice: number | null = null, bbSubsector = industry;

  if (bbRows.length > 0) {
    bbSales = bbRows.reduce((s: number, r: any) => s + (r.reported_sales || 0), 0);
    if (bbSales >= 5) {
      const wt = (field: string) => {
        let sum = 0, w = 0;
        bbRows.forEach((r: any) => { if (r[field] != null && r.reported_sales > 0) { sum += r[field] * r.reported_sales; w += r.reported_sales; } });
        return w > 0 ? sum / w : null;
      };
      const primary = bbRows[0];
      bbMultiple = wt("cashflow_multiple_avg") || primary.cashflow_multiple_avg;
      bbSaleToAsk = wt("sale_to_asking_ratio") || primary.sale_to_asking_ratio;
      bbDaysOnMarket = Math.round(wt("median_days_on_market") || primary.median_days_on_market);
      bbMedianSalePrice = wt("median_sale_price") || primary.median_sale_price;
      bbMedianAskingPrice = wt("median_asking_price") || primary.median_asking_price;
      bbSubsector = bbRows.length === 1 ? primary.subsector : `${bbRows.length} subsectors`;
    }
  }

  // ── Determine the final cashflow_multiple_avg:
  // DealStats preferred (closed comps are more precise than BizBuySell aggregates).
  // BizBuySell used as fallback only.
  const finalMultiple = dstatsMultiple ?? bbMultiple;
  if (!finalMultiple) return { data: null, matchLevel: "hardcoded", sampleSize: 0 };

  // ── Use DealStats margin data for financial lens (prefer band, then national)
  const bestDStats = dstatsBand?.sample_size >= 5 ? dstatsBand : dstatsNational;
  const sdeMargin = bestDStats?.median_sde_margin ?? null;

  // ── Determine match level and sample size for confidence scoring
  // We credit whichever source provided the multiple.
  const matchLevel: MatchLevel = dstatsMultiple
    ? dstatsSource === "dstats_band" ? "industry_national_sizeband" : "industry_national"
    : bbSales >= 50 ? "industry_national" : "industry_national";

  const effectiveSampleSize = dstatsMultiple ? dstatsSampleSize : bbSales;

  return {
    data: {
      median_sale_price: bbMedianSalePrice ?? 0,
      median_asking_price: bbMedianAskingPrice ?? 0,
      sale_to_asking_ratio: bbSaleToAsk ?? 0.93,  // reasonable default
      median_revenue: bestDStats?.median_revenue ?? 0,
      median_cash_flow: bestDStats?.median_sde ?? 0,
      cashflow_multiple_avg: finalMultiple,
      p25_multiple: dstatsP25,
      p75_multiple: dstatsP75,
      median_days_on_market: bbDaysOnMarket ?? 180,
      reported_sales: bbSales,
      subsector: bbSubsector,
      multiple_source: dstatsMultiple ? dstatsSource : "bizbuysell",
      dstats_sample_size: dstatsSampleSize,
      median_sde_margin: sdeMargin,
    },
    matchLevel,
    sampleSize: effectiveSampleSize,
  };
}

// ─── FINANCIAL BENCHMARK LOOKUP (RMA) ────────────────────────────────────────
// Preserved exactly from original.

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

  const { data: t1 } = await supabase.from("industry_financial_benchmarks")
    .select("*").eq("industry_key", industry).eq("company_size_band", sizeBand).single();
  if (t1) return { data: t1, matchLevel: "industry_national_sizeband", sampleSize: 1 };

  const { data: t2 } = await supabase.from("industry_financial_benchmarks")
    .select("*").eq("industry_key", industry).limit(1).single();
  if (t2) return { data: t2, matchLevel: "industry_national", sampleSize: 1 };

  return { data: null, matchLevel: "hardcoded", sampleSize: 0 };
}

// ─── DYNAMIC WEIGHT ADJUSTMENT ───────────────────────────────────────────────
// Preserved exactly from original.

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
  let valuation = 35, debt = 30, financial = 20, liquidity = 15;
  if (financialConf.grade === "INSUFFICIENT") {
    valuation += 8; debt += 7; liquidity += 5; financial = 0;
  } else if (financialConf.grade === "LOW") {
    financial -= 10; valuation += 4; debt += 3; liquidity += 3;
  }
  if (transactionConf.grade === "INSUFFICIENT") {
    valuation += Math.round(liquidity * 0.5); debt += Math.round(liquidity * 0.5); liquidity = 0;
  } else if (transactionConf.grade === "LOW") {
    liquidity -= 7; valuation += 3; debt += 4;
  }
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
      getTransactionBenchmark(industry, revenue),   // now accepts revenue for size-band lookup
      getFinancialBenchmark(industry, revenue),
    ]);

    const listing = listingResult.data;
    const txn = transactionResult.data;
    const fin = financialResult.data;

    // ── Build confidence for each lens
    // Transaction confidence now reflects DealStats sample size when DealStats provided the multiple.
    const listingConfidence: LensConfidence = {
      ...computeConfidence(listingResult.sampleSize, listingResult.matchLevel, 1),
      sampleSize: listingResult.sampleSize,
      matchLevel: listingResult.matchLevel,
      source: "listing_benchmarks",
      description: listingResult.data
        ? `${listingResult.sampleSize} active ${industry} listings${state && listingResult.matchLevel.includes("state") ? ` in ${state}` : " nationally"}`
        : "Using hardcoded industry defaults",
    };

    // Transaction confidence description reflects the actual source of the multiple
    const txnSampleSize = transactionResult.sampleSize;
    const txnSourceLabel = txn?.multiple_source === "dstats_band"
      ? `${txnSampleSize} closed transactions (size-matched)`
      : txn?.multiple_source === "dstats_national"
      ? `${txnSampleSize} closed transactions (national)`
      : `${txnSampleSize.toLocaleString()} closed ${txn?.subsector || industry} sales (BizBuySell 2025)`;

    const transactionConfidence: LensConfidence = {
      ...computeConfidence(txnSampleSize, transactionResult.matchLevel, txn?.multiple_source?.startsWith("dstats") ? 6 : 3),
      sampleSize: txnSampleSize,
      matchLevel: transactionResult.matchLevel,
      source: "transaction_benchmarks",
      description: txn ? txnSourceLabel : "No transaction data available",
    };

    const financialConfidence: LensConfidence = {
      ...computeConfidence(financialResult.sampleSize, financialResult.matchLevel, 12),
      sampleSize: financialResult.sampleSize,
      matchLevel: financialResult.matchLevel,
      source: "financial_benchmarks",
      description: financialResult.data
        ? `RMA ${financialResult.data.company_size_band} revenue band`
        : txn?.median_sde_margin
        ? `DealStats margin benchmark: ${(txn.median_sde_margin * 100).toFixed(1)}% SDE margin`
        : "RMA data not yet loaded",
    };

    // ── Computed weights
    const weights = adjustWeights(listingConfidence, transactionConfidence, financialConfidence);

    const grades = [listingConfidence.grade, transactionConfidence.grade, financialConfidence.grade];
    const highCount = grades.filter((g) => g === "HIGH").length;
    const insuffCount = grades.filter((g) => g === "INSUFFICIENT").length;
    const overallConfidence: ConfidenceGrade =
      highCount >= 2 ? "HIGH" : insuffCount >= 2 ? "LOW" : "MEDIUM";

    // ── Effective multiple range
    // Now uses DealStats p25/p75 when available — much more precise than ±25% hack.
    const effectiveMultipleRange: [number, number] = txn?.p25_multiple && txn?.p75_multiple
      ? [+txn.p25_multiple.toFixed(2), +txn.p75_multiple.toFixed(2)]
      : txn
      ? [+(txn.cashflow_multiple_avg * 0.75).toFixed(2), +(txn.cashflow_multiple_avg * 1.25).toFixed(2)]
      : listing
      ? [+(listing.p25_multiple || hardcoded.multipleRange[0]).toFixed(2), +(listing.p75_multiple || hardcoded.multipleRange[1]).toFixed(2)]
      : hardcoded.multipleRange;

    // ── Effective fair value
    // Prefers DealStats median MVIC → SDE × DealStats multiple → BizBuySell sale price
    const dstatsNationalRow = transactionResult.data?.multiple_source?.startsWith("dstats")
      ? null  // We don't have median_mvic in the response, compute from multiple
      : null;

    const effectiveFairValue = txn
      ? Math.round(sde * txn.cashflow_multiple_avg)
      : listing
      ? Math.round(sde * listing.median_multiple)
      : Math.round(sde * (hardcoded.multipleRange[0] + hardcoded.multipleRange[1]) / 2);

    // ── Seller-buyer gap (listing median vs sold median)
    const sellerBuyerGap = listing && txn
      ? +((listing.median_multiple - txn.cashflow_multiple_avg) / txn.cashflow_multiple_avg * 100).toFixed(1)
      : null;

    const saleToAsk = txn?.sale_to_asking_ratio || null;
    const estimatedNegotiatedPrice = saleToAsk ? Math.round(asking_price * saleToAsk) : null;

    // ── Smart offer range (preserved from original, no changes)
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

    // ── Financial quality (preserved, with DealStats margin as additional source)
    const industryMedianMargin = fin?.median_sde_margin
      ? fin.median_sde_margin
      : txn?.median_sde_margin
      ? txn.median_sde_margin * 100  // DealStats stores as decimal
      : (hardcoded.marginRange[0] + hardcoded.marginRange[1]) / 2;

    const financialQuality = {
      dealMargin: sdeMargin,
      industryMedian: industryMedianMargin,
      aboveAverage: sdeMargin > industryMedianMargin,
    };

    return NextResponse.json({
      success: true,

      // ── Three-lens benchmark data (response shape preserved exactly)
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
          // cashflowMultiple is now DealStats-sourced when available.
          // Components read this field for valuation scoring — no component changes needed.
          cashflowMultiple: txn.cashflow_multiple_avg,
          medianSalePrice: txn.median_sale_price,
          medianAskingPrice: txn.median_asking_price,
          saleToAskRatio: txn.sale_to_asking_ratio,
          cashflowMultipleAvg: txn.cashflow_multiple_avg,  // alias for compat
          medianRevenue: txn.median_revenue,
          medianCashFlow: txn.median_cash_flow,
          daysOnMarket: txn.median_days_on_market,
          reportedSales: txn.reported_sales,
          subsector: txn.subsector,
          // DealStats range (new — used by Deal Reality Check for offer range)
          p25Multiple: txn.p25_multiple,
          p75Multiple: txn.p75_multiple,
        } : null,

        // Financial lens: prefers RMA, falls back to DealStats margin data
        financial: fin
          ? {
              sdeMargin: fin.median_sde_margin,
              operatingMargin: fin.median_operating_margin,
              netMargin: fin.median_net_margin,
              revenuePerEmployee: fin.median_revenue_per_employee,
              currentRatio: fin.median_current_ratio,
              sizeBand: fin.company_size_band,
            }
          : txn?.median_sde_margin
          ? {
              // DealStats margin as financial lens fallback (when RMA not loaded)
              sdeMargin: txn.median_sde_margin,
              operatingMargin: null,
              netMargin: null,
              revenuePerEmployee: null,
              currentRatio: null,
              sizeBand: null,
            }
          : null,
      },

      // ── Computed analysis (response shape preserved exactly)
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

      // ── Confidence (response shape preserved exactly)
      confidence: {
        overall: overallConfidence,
        listing: listingConfidence,
        transaction: transactionConfidence,
        financial: financialConfidence,
        weights,
      },

      // ── Hardcoded fallback (preserved for backward compat)
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
