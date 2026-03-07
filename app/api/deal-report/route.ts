import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const weekParam = searchParams.get("week"); // YYYY-MM-DD

    // Get latest report or specific week
    let query = supabase
      .from("report_snapshots")
      .select("*")
      .order("week_start", { ascending: false })
      .limit(1);

    if (weekParam) {
      query = supabase
        .from("report_snapshots")
        .select("*")
        .eq("week_start", weekParam)
        .limit(1);
    }

    const { data: report, error } = await query.single();

    if (error || !report) {
      // If no report exists, generate live data from this week's runs
      const weekStart = weekParam || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      
      const { data: runs } = await supabase
        .from("deal_runs")
        .select("*")
        .gte("created_at", weekStart)
        .eq("is_valid", true);

      if (!runs || runs.length === 0) {
        return NextResponse.json({ report: null, message: "No data for this period" });
      }

      // Compute metrics on the fly
      const uniqueClusters = new Set(runs.map((r) => r.cluster_id).filter(Boolean));
      const multiples = runs.map((r) => r.valuation_multiple).filter(Boolean);
      const dscrs = runs.map((r) => r.dscr).filter(Boolean);
      const scores = runs.map((r) => r.overall_score).filter(Boolean);

      const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const median = (arr: number[]) => {
        if (!arr.length) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      };

      // Industry breakdown
      const industryMap: Record<string, { count: number; scores: number[]; multiples: number[]; dscrs: number[] }> = {};
      runs.forEach((r) => {
        if (!industryMap[r.industry]) industryMap[r.industry] = { count: 0, scores: [], multiples: [], dscrs: [] };
        industryMap[r.industry].count++;
        if (r.overall_score) industryMap[r.industry].scores.push(r.overall_score);
        if (r.valuation_multiple) industryMap[r.industry].multiples.push(r.valuation_multiple);
        if (r.dscr) industryMap[r.industry].dscrs.push(r.dscr);
      });

      const industryBreakdown: Record<string, { count: number; avg_score: number; avg_multiple: number; avg_dscr: number }> = {};
      Object.entries(industryMap).forEach(([ind, data]) => {
        industryBreakdown[ind] = {
          count: data.count,
          avg_score: Math.round(avg(data.scores)),
          avg_multiple: +avg(data.multiples).toFixed(2),
          avg_dscr: +avg(data.dscrs).toFixed(2),
        };
      });

      const sortedByScore = Object.entries(industryBreakdown).sort((a, b) => a[1].avg_score - b[1].avg_score);

      const liveReport = {
        week_start: weekStart,
        week_end: new Date().toISOString().split("T")[0],
        total_runs: runs.length,
        unique_deals: uniqueClusters.size,
        reality_check_runs: runs.filter((r) => r.tool_used === "reality_check").length,
        risk_analyzer_runs: runs.filter((r) => r.tool_used === "risk_analyzer").length,
        avg_revenue: Math.round(avg(runs.map((r) => r.revenue))),
        avg_sde: Math.round(avg(runs.map((r) => r.sde))),
        avg_price: Math.round(avg(runs.map((r) => r.asking_price))),
        median_revenue: Math.round(median(runs.map((r) => r.revenue))),
        median_sde: Math.round(median(runs.map((r) => r.sde))),
        median_price: Math.round(median(runs.map((r) => r.asking_price))),
        avg_asking_multiple: +avg(multiples).toFixed(2),
        avg_fair_multiple: 2.5,
        overpricing_gap_pct: +((avg(multiples) - 2.5) / 2.5 * 100).toFixed(1),
        pct_overpriced: +(runs.filter((r) => r.valuation_multiple > 3.5).length / runs.length * 100).toFixed(1),
        pct_underpriced: +(runs.filter((r) => r.valuation_multiple < 2.0).length / runs.length * 100).toFixed(1),
        pct_fair: +(runs.filter((r) => r.valuation_multiple >= 2.0 && r.valuation_multiple <= 3.5).length / runs.length * 100).toFixed(1),
        pct_low_risk: +(runs.filter((r) => r.risk_level === "Low").length / runs.length * 100).toFixed(1),
        pct_moderate_risk: +(runs.filter((r) => r.risk_level === "Moderate").length / runs.length * 100).toFixed(1),
        pct_high_risk: +(runs.filter((r) => r.risk_level === "High").length / runs.length * 100).toFixed(1),
        pct_critical_risk: +(runs.filter((r) => r.risk_level === "Critical").length / runs.length * 100).toFixed(1),
        avg_dscr: +avg(dscrs).toFixed(2),
        median_dscr: +median(dscrs).toFixed(2),
        avg_score: Math.round(avg(scores)),
        median_score: Math.round(median(scores)),
        industry_breakdown: industryBreakdown,
        highest_risk_industry: sortedByScore[0]?.[0] || null,
        lowest_risk_industry: sortedByScore[sortedByScore.length - 1]?.[0] || null,
        most_analyzed_industry: Object.entries(industryBreakdown).sort((a, b) => b[1].count - a[1].count)[0]?.[0] || null,
        is_live: true,
      };

      return NextResponse.json({ report: liveReport });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Report fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
