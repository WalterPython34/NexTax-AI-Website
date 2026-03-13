import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getSizeBand(revenue: number): string {
  if (revenue < 500000) return "under_500k";
  if (revenue < 1000000) return "500k_1m";
  if (revenue < 3000000) return "1m_3m";
  if (revenue < 10000000) return "3m_10m";
  return "10m_plus";
}

// NAICS code to NexTax industry key mapping
const NAICS_MAP: Record<string, string> = {
  "238220": "plumbing", "238221": "plumbing",
  "238210": "electrical", "238211": "electrical",
  "238220": "plumbing",
  "238290": "hvac", "238220": "plumbing",
  "561730": "landscaping", "561720": "landscaping",
  "811111": "autorepair", "811112": "autorepair", "811118": "autorepair",
  "812310": "laundromat", "812320": "laundromat",
  "561720": "cleaning", "561710": "cleaning", "561740": "cleaning",
  "722511": "restaurant", "722513": "restaurant", "722514": "restaurant", "722515": "restaurant",
  "621210": "dental",
  "713940": "gym",
  "812111": "medspa", "812112": "medspa",
  "541211": "accounting", "541213": "accounting", "541219": "accounting",
  "524210": "insurance", "524292": "insurance",
  "238160": "roofing",
  "812910": "petcare",
  "446110": "pharmacy",
  "624410": "daycare",
  "454110": "ecommerce", "519130": "ecommerce",
  "511210": "saas",
  "484110": "transportation", "484121": "transportation", "484122": "transportation",
  "323111": "printing", "323113": "printing",
  "531130": "storage",
  "238320": "painting",
  "561612": "security", "561621": "security",
  "621610": "healthcare", "621111": "healthcare", "621112": "healthcare",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { records, naicsCode, industryKey, batchName } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "No records provided" }, { status: 400 });
    }

    const batchId = batchName || `dealstats_${new Date().toISOString().split("T")[0]}_${Date.now().toString(36)}`;
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const record of records) {
      try {
        const revenue = parseFloat(record.revenue) || 0;
        const sde = parseFloat(record.sde) || 0;
        const ebitda = parseFloat(record.ebitda) || 0;
        const mvic = parseFloat(record.mvic_price) || 0;
        const opProfit = parseFloat(record.operating_profit) || 0;
        const assets = parseFloat(record.assets) || 0;

        // Skip if no meaningful financial data
        if (mvic <= 0 && revenue <= 0) { skipped++; continue; }

        // Determine industry key
        const mappedIndustry = industryKey || (record.naics_code ? NAICS_MAP[record.naics_code] : null) || record.industry_key || null;

        const payload = {
          industry_key: mappedIndustry,
          naics_code: naicsCode || record.naics_code || null,
          naics_description: record.naics_description || null,
          mvic_price: mvic || null,
          revenue: revenue || null,
          sde: sde || null,
          ebitda: ebitda || null,
          operating_profit: opProfit || null,
          assets: assets || null,
          mvic_to_revenue: revenue > 0 && mvic > 0 ? +(mvic / revenue).toFixed(3) : null,
          mvic_to_sde: sde > 0 && mvic > 0 ? +(mvic / sde).toFixed(3) : null,
          mvic_to_ebitda: ebitda > 0 && mvic > 0 ? +(mvic / ebitda).toFixed(3) : null,
          operating_margin_pct: revenue > 0 && opProfit ? +((opProfit / revenue) * 100).toFixed(1) : record.operating_margin_pct || null,
          sde_margin_pct: revenue > 0 && sde > 0 ? +((sde / revenue) * 100).toFixed(1) : record.sde_margin_pct || null,
          ebitda_margin_pct: revenue > 0 && ebitda > 0 ? +((ebitda / revenue) * 100).toFixed(1) : record.ebitda_margin_pct || null,
          sale_year: record.sale_year || new Date().getFullYear(),
          sale_date: record.sale_date || null,
          deal_type: record.deal_type || "unknown",
          size_band: revenue > 0 ? getSizeBand(revenue) : null,
          import_batch_id: batchId,
        };

        const { error } = await supabase.from("dealstats_transactions").insert(payload);
        if (error) { errors++; } else { inserted++; }
      } catch { errors++; }
    }

    // Recompute benchmarks if any records were inserted
    let benchmarksComputed = false;
    if (inserted > 0) {
      try {
        const { error } = await supabase.rpc("compute_dealstats_benchmarks");
        benchmarksComputed = !error;
      } catch { /* non-blocking */ }
    }

    return NextResponse.json({
      success: true,
      batch_id: batchId,
      results: { total: records.length, inserted, skipped, errors },
      benchmarks_computed: benchmarksComputed,
    });
  } catch (error) {
    console.error("DealStats load error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
