// app/api/benchmarks/snapshots/latest/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch latest-snapshot lookup. Compare uses this to fetch the most recent
// snapshot for each of two (or more) deals in a single round-trip.
//
// GET /api/benchmarks/snapshots/latest?user_id=...&deal_ids=id1,id2
//
// Returns: { ok: true, snapshots: { [deal_id]: full_snapshot_or_null } }
//
// Designed for read-side performance — Compare loads on every selector
// change, so we pull each deal's latest in one query using DISTINCT ON.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id")?.trim();
    const dealIdsParam = searchParams.get("deal_ids")?.trim();

    if (!user_id) {
      return NextResponse.json(
        { ok: false, error: "user_id query param required" },
        { status: 400 },
      );
    }
    if (!dealIdsParam) {
      return NextResponse.json(
        { ok: false, error: "deal_ids query param required (comma-separated)" },
        { status: 400 },
      );
    }

    const dealIds = dealIdsParam
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 10);   // hard cap — no one should be batching more than 10 anyway

    if (dealIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "no valid deal_ids provided" },
        { status: 400 },
      );
    }

    const supabase = getSupabase();

    // We can't do DISTINCT ON via the Supabase JS client easily. Instead:
    // Pull all snapshots for the requested deals in one query, then take the
    // first (newest) one per deal in JS. With at most 10 deals × maybe 50
    // snapshots each = 500 rows, this is trivially fast.
    const { data, error } = await supabase
      .from("benchmark_snapshots")
      .select("*")
      .eq("user_id", user_id)
      .in("deal_id", dealIds)
      .order("deal_id", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[snapshots/latest GET] error:", error);
      return NextResponse.json({ ok: false, error: "fetch failed" }, { status: 500 });
    }

    // Take the first (newest) snapshot per deal_id
    const byDeal: Record<string, any> = {};
    for (const id of dealIds) byDeal[id] = null;

    for (const row of data ?? []) {
      if (byDeal[row.deal_id] === null) {
        byDeal[row.deal_id] = row;
      }
    }

    return NextResponse.json({ ok: true, snapshots: byDeal });
  } catch (err: any) {
    console.error("[snapshots/latest GET] uncaught:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "internal error" },
      { status: 500 },
    );
  }
}
