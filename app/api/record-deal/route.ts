import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Generate deal fingerprint for exact-match dedup
function generateFingerprint(
  industry: string,
  revenue: number,
  sde: number,
  price: number,
  state?: string
): string {
  return `${industry}_${Math.round(revenue / 1000)}k_${Math.round(sde / 1000)}k_${Math.round(price / 1000)}k_${state || "us"}`.toLowerCase();
}

// Validate deal inputs (filter garbage)
function isValidDeal(revenue: number, sde: number, price: number): boolean {
  return (
    revenue >= 200000 &&
    sde >= 75000 &&
    price >= 150000 &&
    sde <= revenue &&
    price > 0 &&
    sde / revenue <= 0.9
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const lead_id = body.lead_id ?? null;  // passed from client

    const {
      tool_used,
      industry,
      revenue,
      sde,
      asking_price,
      debt_percent,
      interest_rate,
      term_years,
      city,
      state,
      zip_code,
      employees,
      years_in_business,
      revenue_trend,
      customer_concentration,
      owner_operated,
      has_real_estate,
      // Computed outputs
      valuation_multiple,
      dscr,
      monthly_payment,
      fair_value,
      recommended_offer_low,
      recommended_offer_high,
      overall_score,
      risk_level,
      valuation_score,
      debt_score,
      market_score,
      industry_score,
      operational_score,
      red_flags,
      green_flags,
    } = body;

    // Parse numeric values
    const revNum = typeof revenue === "string" ? parseFloat(revenue.replace(/,/g, "")) : revenue;
    const sdeNum = typeof sde === "string" ? parseFloat(sde.replace(/,/g, "")) : sde;
    const priceNum = typeof asking_price === "string" ? parseFloat(asking_price.replace(/,/g, "")) : asking_price;

    // Generate fingerprint
    const fingerprint = generateFingerprint(industry, revNum, sdeNum, priceNum, state);

    // Validate deal
    const is_valid = isValidDeal(revNum, sdeNum, priceNum);

    // Find or create cluster (±10% fuzzy match)
    let cluster_id: string | null = null;

    if (is_valid) {
      // Look for existing cluster
      const { data: existingCluster } = await supabaseAdmin
        .from("deal_clusters")
        .select("id, runs_count, median_revenue, median_sde, median_price, unique_tools")
        .eq("industry", industry)
        .gte("median_revenue", revNum * 0.9)
        .lte("median_revenue", revNum * 1.1)
        .gte("median_sde", sdeNum * 0.9)
        .lte("median_sde", sdeNum * 1.1)
        .gte("median_price", priceNum * 0.9)
        .lte("median_price", priceNum * 1.1)
        .eq("is_active", true)
        .order("last_seen", { ascending: false })
        .limit(1)
        .single();

      if (existingCluster) {
        // Update existing cluster
        cluster_id = existingCluster.id;
        const newCount = existingCluster.runs_count + 1;
        const tools = Array.from(new Set([...(existingCluster.unique_tools || []), tool_used]));

        // Running median approximation
        const newMedianRevenue = (existingCluster.median_revenue * existingCluster.runs_count + revNum) / newCount;
        const newMedianSde = (existingCluster.median_sde * existingCluster.runs_count + sdeNum) / newCount;
        const newMedianPrice = (existingCluster.median_price * existingCluster.runs_count + priceNum) / newCount;

        await supabaseAdmin
          .from("deal_clusters")
          .update({
            runs_count: newCount,
            median_revenue: Math.round(newMedianRevenue),
            median_sde: Math.round(newMedianSde),
            median_price: Math.round(newMedianPrice),
            median_multiple: +(newMedianPrice / newMedianSde).toFixed(2),
            median_dscr: dscr,
            median_score: overall_score,
            best_score: Math.max(existingCluster.runs_count > 0 ? overall_score : 0, overall_score),
            worst_score: Math.min(existingCluster.runs_count > 0 ? overall_score : 100, overall_score),
            unique_tools: tools,
            last_seen: new Date().toISOString(),
          })
          .eq("id", cluster_id);
      } else {
        // Create new cluster
        const { data: newCluster } = await supabaseAdmin
          .from("deal_clusters")
          .insert({
            industry,
            state: state || null,
            median_revenue: revNum,
            median_sde: sdeNum,
            median_price: priceNum,
            median_multiple: +(priceNum / sdeNum).toFixed(2),
            median_dscr: dscr,
            median_score: overall_score,
            best_score: overall_score,
            worst_score: overall_score,
            runs_count: 1,
            unique_tools: [tool_used],
          })
          .select("id")
          .single();

        cluster_id = newCluster?.id || null;
      }
    }

    // Insert deal run
    const { error } = await supabaseAdmin.from("deal_runs").insert({
      tool_used,
      industry,
      revenue: revNum,
      sde: sdeNum,
      asking_price: priceNum,
      debt_percent: debt_percent || null,
      interest_rate: interest_rate || null,
      term_years: term_years || null,
      city: city || null,
      state: state || null,
      zip_code: zip_code || null,
      employees: employees || null,
      years_in_business: years_in_business || null,
      revenue_trend: revenue_trend || null,
      customer_concentration: customer_concentration || null,
      owner_operated: owner_operated ?? null,
      has_real_estate: has_real_estate ?? null,
      valuation_multiple,
      dscr,
      monthly_payment,
      fair_value,
      recommended_offer_low,
      recommended_offer_high,
      overall_score,
      risk_level,
      valuation_score,
      debt_score,
      market_score,
      industry_score,
      operational_score: operational_score || null,
      red_flags: red_flags || [],
      green_flags: green_flags || [],
      fingerprint,
      cluster_id,
      is_valid,
      lead_id,   // ← populated from session, null if not logged in
    });

    if (error) {
      console.error("Deal record error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, cluster_id, fingerprint, is_valid });
  } catch (error) {
    console.error("Record deal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
