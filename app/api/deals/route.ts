import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const industry = url.searchParams.get("industry");
  const state = url.searchParams.get("state");
  const minPrice = url.searchParams.get("minPrice");
  const maxPrice = url.searchParams.get("maxPrice");
  const minScore = url.searchParams.get("minScore");
  const sort = url.searchParams.get("sort") || "created_at";
  const order = url.searchParams.get("order") || "desc";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 30;
  const offset = (page - 1) * limit;

  try {
    let query = supabase
      .from("deal_runs")
      .select("*", { count: "exact" })
      .eq("is_valid", true)
      .gt("revenue", 0)
      .gt("sde", 0)
      .gt("asking_price", 0);

    if (industry && industry !== "all") query = query.eq("industry", industry);
    if (state) query = query.eq("state", state);
    if (minPrice) query = query.gte("asking_price", parseFloat(minPrice));
    if (maxPrice) query = query.lte("asking_price", parseFloat(maxPrice));
    if (minScore) query = query.gte("overall_score", parseInt(minScore));

    const validSorts: Record<string, string> = {
      created_at: "created_at",
      asking_price: "asking_price",
      revenue: "revenue",
      overall_score: "overall_score",
      valuation_multiple: "valuation_multiple",
    };
    const sortCol = validSorts[sort] || "created_at";

    query = query.order(sortCol, { ascending: order === "asc" }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get industry counts for filter sidebar
    const { data: industryCounts } = await supabase
      .from("deal_runs")
      .select("industry")
      .eq("is_valid", true)
      .gt("revenue", 0);

    const counts: Record<string, number> = {};
    (industryCounts || []).forEach((d) => {
      if (d.industry) counts[d.industry] = (counts[d.industry] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      deals: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
      industryCounts: counts,
    });
  } catch (error) {
    console.error("Deals browse error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
