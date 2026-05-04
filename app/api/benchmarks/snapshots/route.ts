// app/api/benchmarks/snapshots/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Benchmark Snapshots — list and create endpoints.
//
//   GET  /api/benchmarks/snapshots?deal_id=...      → list snapshots for a deal
//   POST /api/benchmarks/snapshots                   → create a snapshot manually
//                                                       (auto-creation happens
//                                                       inside score-deal)
//
// The PATCH endpoint to mark a snapshot as saved lives at:
//   PATCH /api/benchmarks/snapshots/[id]
//
// Auth: routes use the service-role Supabase client and rely on the client to
// pass user_id in the body / query string (same pattern as /api/record-deal).
// RLS on the table enforces the same auth scope for direct client reads.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Bucket revenue into a coarse band for analytics. Stored at write-time so
 * aggregate queries can group without re-reading raw revenue.
 */
function revenueBand(revenue: number | null | undefined): string | null {
  if (typeof revenue !== "number" || !Number.isFinite(revenue) || revenue <= 0) return null;
  if (revenue < 500_000)    return "<500K";
  if (revenue < 1_000_000)  return "500K-1M";
  if (revenue < 2_500_000)  return "1M-2.5M";
  if (revenue < 5_000_000)  return "2.5M-5M";
  if (revenue < 10_000_000) return "5M-10M";
  return "10M+";
}

// ── GET: list snapshots for a deal ───────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deal_id = searchParams.get("deal_id")?.trim();
    const user_id = searchParams.get("user_id")?.trim();
    const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);

    if (!deal_id) {
      return NextResponse.json(
        { ok: false, error: "deal_id query param required" },
        { status: 400 },
      );
    }
    if (!user_id) {
      return NextResponse.json(
        { ok: false, error: "user_id query param required" },
        { status: 400 },
      );
    }

    const supabase = getSupabase();

    // Lightweight list — return summary fields, not the full JSONB blobs.
    // The client reloads a single snapshot via its detail by calling this
    // endpoint with ?include=full or by a separate GET-by-id (future).
    const { data, error } = await supabase
      .from("benchmark_snapshots")
      .select(`
        snapshot_id,
        deal_id,
        created_at,
        industry,
        revenue_band,
        view_type,
        is_saved,
        analysis_outputs,
        deal_structure
      `)
      .eq("deal_id", deal_id)
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[snapshots GET] error:", error);
      return NextResponse.json({ ok: false, error: "fetch failed" }, { status: 500 });
    }

    // Pull a few summary fields out of analysis_outputs JSONB so the UI list
    // can render score / tension without parsing the full blob client-side.
    const summarized = (data ?? []).map(row => {
      const ao: any = row.analysis_outputs ?? {};
      return {
        snapshot_id: row.snapshot_id,
        deal_id: row.deal_id,
        created_at: row.created_at,
        industry: row.industry,
        revenue_band: row.revenue_band,
        view_type: row.view_type,
        is_saved: row.is_saved,
        financial_score: ao.financial_score ?? null,
        tension_indicator: ao.tension_indicator ?? null,
        risk_flag_count: Array.isArray(ao.risk_flags) ? ao.risk_flags.length : 0,
        interaction_insight_count: Array.isArray(ao.interaction_insights) ? ao.interaction_insights.length : 0,
      };
    });

    return NextResponse.json({ ok: true, snapshots: summarized });
  } catch (err: any) {
    console.error("[snapshots GET] uncaught:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "internal error" },
      { status: 500 },
    );
  }
}

// ── POST: create a snapshot manually ─────────────────────────────────────────
//
// Most snapshots are auto-created by score-deal. This endpoint exists so the
// UI can also "Save Snapshot" by re-posting the current analysis if no
// auto-snapshot was made (edge case), or for future bulk-import scenarios.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "JSON body required" }, { status: 400 });
    }

    const {
      deal_id,
      user_id,
      industry,
      naics_code,
      view_type = "buyer_adjusted",
      is_saved = false,
      financial_inputs,
      computed_ratios,
      benchmark_results,
      analysis_outputs,
      deal_structure,
      client_run_id,
    } = body;

    if (!deal_id || !user_id) {
      return NextResponse.json(
        { ok: false, error: "deal_id and user_id required" },
        { status: 400 },
      );
    }
    if (!financial_inputs || !analysis_outputs) {
      return NextResponse.json(
        { ok: false, error: "financial_inputs and analysis_outputs required" },
        { status: 400 },
      );
    }

    const revenue_band = revenueBand(financial_inputs?.revenue);

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("benchmark_snapshots")
      .insert({
        deal_id,
        user_id,
        industry: industry ?? null,
        naics_code: naics_code ?? null,
        revenue_band,
        view_type,
        is_saved: !!is_saved,
        financial_inputs,
        computed_ratios: computed_ratios ?? {},
        benchmark_results: benchmark_results ?? [],
        analysis_outputs,
        deal_structure: deal_structure ?? null,
        client_run_id: client_run_id ?? null,
        generated_at: analysis_outputs?.generated_at ?? null,
      })
      .select("snapshot_id, created_at, is_saved")
      .single();

    if (error) {
      console.error("[snapshots POST] insert error:", error);
      return NextResponse.json({ ok: false, error: "insert failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, snapshot: data });
  } catch (err: any) {
    console.error("[snapshots POST] uncaught:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "internal error" },
      { status: 500 },
    );
  }
}
