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
    let updated = 0;
    let errors = 0;

    for (const record of records) {
      if (!record.industry_key || !record.data_year) {
        errors++;
        continue;
      }

      // Compute derived fields
      const revenueGrowth = record.revenue_growth_pct || 0;
      const lifecycle = revenueGrowth > 3 ? "growing" : revenueGrowth > -1 ? "mature" : "declining";
      const estTransactions = record.enterprises ? Math.round(record.enterprises * 0.05) : null;
      const marketSize = record.revenue_millions > 50000 ? "large" : record.revenue_millions > 10000 ? "medium" : "small";

      const payload = {
        industry_key: record.industry_key,
        ibis_industry_code: record.ibis_industry_code || null,
        ibis_industry_name: record.ibis_industry_name || record.industry_key,
        data_year: record.data_year,
        revenue_millions: record.revenue_millions || null,
        enterprises: record.enterprises || null,
        establishments: record.establishments || null,
        employment: record.employment || null,
        wages_millions: record.wages_millions || null,
        iva_millions: record.iva_millions || null,
        revenue_growth_pct: record.revenue_growth_pct || null,
        enterprise_growth_pct: record.enterprise_growth_pct || null,
        establishment_growth_pct: record.establishment_growth_pct || null,
        employment_growth_pct: record.employment_growth_pct || null,
        wage_growth_pct: record.wage_growth_pct || null,
        revenue_per_employee: record.revenue_per_employee || null,
        revenue_per_enterprise_millions: record.revenue_per_enterprise_millions || null,
        employees_per_establishment: record.employees_per_establishment || null,
        employees_per_enterprise: record.employees_per_enterprise || null,
        average_wage: record.average_wage || null,
        wages_to_revenue_pct: record.wages_to_revenue_pct || null,
        establishments_per_enterprise: record.establishments_per_enterprise || null,
        iva_to_revenue_pct: record.iva_to_revenue_pct || null,
        estimated_annual_transactions: estTransactions,
        market_size_band: marketSize,
        industry_lifecycle: lifecycle,
      };

      // Upsert — update if same industry+year exists
      const { data: existing } = await supabase
        .from("industry_ibis_benchmarks")
        .select("id")
        .eq("industry_key", record.industry_key)
        .eq("data_year", record.data_year)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("industry_ibis_benchmarks")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) errors++;
        else updated++;
      } else {
        const { error } = await supabase
          .from("industry_ibis_benchmarks")
          .insert(payload);
        if (error) errors++;
        else inserted++;
      }
    }

    return NextResponse.json({
      success: true,
      results: { total: records.length, inserted, updated, errors },
    });
  } catch (error) {
    console.error("IBIS load error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
