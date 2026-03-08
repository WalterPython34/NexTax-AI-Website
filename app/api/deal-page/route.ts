import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateAddress(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateSlug(industry: string, city: string | null, revenue: number): string {
  const parts = [
    industry.toLowerCase().replace(/[^a-z]/g, ""),
    city ? city.toLowerCase().replace(/[^a-z]/g, "") : null,
    Math.round(revenue / 1000) + "k",
  ].filter(Boolean);
  return parts.join("-");
}

// POST — Create a new deal page
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address = generateAddress();
    const slug = generateSlug(body.industry, body.city, body.revenue);

    // Check slug uniqueness, append address if needed
    const { data: existing } = await supabase
      .from("deal_pages")
      .select("id")
      .eq("slug", slug)
      .limit(1)
      .single();

    const finalSlug = existing ? `${slug}-${address.toLowerCase()}` : slug;

    const { data: page, error } = await supabase
      .from("deal_pages")
      .insert({
        deal_address: address,
        slug: finalSlug,
        industry: body.industry,
        industry_label: body.industry_label,
        city: body.city || null,
        state: body.state || null,
        revenue: body.revenue,
        sde: body.sde,
        asking_price: body.asking_price,
        valuation_multiple: body.valuation_multiple,
        dscr: body.dscr,
        monthly_payment: body.monthly_payment,
        fair_value: body.fair_value,
        recommended_offer_low: body.recommended_offer_low,
        recommended_offer_high: body.recommended_offer_high,
        overall_score: body.overall_score,
        risk_level: body.risk_level,
        valuation_score: body.valuation_score,
        debt_score: body.debt_score,
        market_score: body.market_score,
        industry_score: body.industry_score,
        operational_score: body.operational_score || null,
        deal_dri: body.fair_value > 0 ? +(body.asking_price / body.fair_value).toFixed(2) : null,
        red_flags: body.red_flags || [],
        green_flags: body.green_flags || [],
        ai_insight: body.ai_insight || null,
        community_avg_score: body.community_avg_score || null,
        community_top_score: body.community_top_score || null,
        community_lowest_score: body.community_lowest_score || null,
        community_percentile: body.community_percentile || null,
        similar_deals_count: body.similar_deals_count || null,
        demand_level: body.demand_level || null,
        buyer_interest_rank: body.buyer_interest_rank || null,
        competition_level: body.competition_level || null,
        source_tool: body.source_tool || "reality_check",
        cluster_id: body.cluster_id || null,
      })
      .select("deal_address, slug")
      .single();

    if (error) {
      console.error("Create deal page error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deal_address: page.deal_address,
      slug: page.slug,
      url: `/deal/${page.slug}`,
    });
  } catch (error) {
    console.error("Deal page error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
