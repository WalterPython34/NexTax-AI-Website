import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { records } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "No records provided" }, { status: 400 });
    }

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const record of records) {
      try {
        const { error } = await supabase
          .from("industry_transaction_benchmarks")
          .upsert({
            sector: record.sector,
            subsector: record.subsector,
            industry_key: record.industry_key,
            reported_sales: record.reported_sales,
            median_sale_price: record.median_sale_price,
            median_asking_price: record.median_asking_price,
            sale_to_asking_ratio: record.sale_to_asking_ratio,
            median_revenue: record.median_revenue,
            revenue_multiple_avg: record.revenue_multiple_avg,
            median_cash_flow: record.median_cash_flow,
            cashflow_multiple_avg: record.cashflow_multiple_avg,
            median_days_on_market: record.median_days_on_market,
            data_year: record.data_year,
            data_source: record.data_source || "bizbuysell",
          }, {
            onConflict: "subsector,data_year,data_source",
            ignoreDuplicates: false,
          });

        if (error) {
          // If upsert fails (no unique constraint yet), try insert
          const { error: insertError } = await supabase
            .from("industry_transaction_benchmarks")
            .insert({
              sector: record.sector,
              subsector: record.subsector,
              industry_key: record.industry_key,
              reported_sales: record.reported_sales,
              median_sale_price: record.median_sale_price,
              median_asking_price: record.median_asking_price,
              sale_to_asking_ratio: record.sale_to_asking_ratio,
              median_revenue: record.median_revenue,
              revenue_multiple_avg: record.revenue_multiple_avg,
              median_cash_flow: record.median_cash_flow,
              cashflow_multiple_avg: record.cashflow_multiple_avg,
              median_days_on_market: record.median_days_on_market,
              data_year: record.data_year,
              data_source: record.data_source || "bizbuysell",
            });

          if (insertError) { errors++; } else { inserted++; }
        } else {
          inserted++;
        }
      } catch {
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      results: { total: records.length, inserted, skipped, errors },
    });
  } catch (error) {
    console.error("Benchmark load error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
