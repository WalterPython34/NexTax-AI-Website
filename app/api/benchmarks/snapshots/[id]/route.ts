// app/api/benchmarks/snapshots/[id]/route.ts
// ─────────────────────────────────────────────────────────────────────────────
//   GET   /api/benchmarks/snapshots/:id?user_id=...   → full snapshot detail
//   PATCH /api/benchmarks/snapshots/:id                → mark as saved/unsaved
//
// Used for:
//   - GET: reload a prior analysis (rehydrate the inputs and results)
//   - PATCH: toggle is_saved flag when user clicks "Save Snapshot"
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ── GET: full snapshot detail ────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id")?.trim();

    if (!id) {
      return NextResponse.json({ ok: false, error: "snapshot id required" }, { status: 400 });
    }
    if (!user_id) {
      return NextResponse.json({ ok: false, error: "user_id required" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("benchmark_snapshots")
      .select("*")
      .eq("snapshot_id", id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (error) {
      console.error("[snapshot GET] error:", error);
      return NextResponse.json({ ok: false, error: "fetch failed" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, snapshot: data });
  } catch (err: any) {
    console.error("[snapshot GET] uncaught:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "internal error" },
      { status: 500 },
    );
  }
}

// ── PATCH: toggle is_saved flag ──────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "JSON body required" }, { status: 400 });
    }

    const { user_id, is_saved } = body;
    if (!user_id) {
      return NextResponse.json({ ok: false, error: "user_id required" }, { status: 400 });
    }
    if (typeof is_saved !== "boolean") {
      return NextResponse.json({ ok: false, error: "is_saved boolean required" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("benchmark_snapshots")
      .update({ is_saved })
      .eq("snapshot_id", id)
      .eq("user_id", user_id)
      .select("snapshot_id, is_saved")
      .maybeSingle();

    if (error) {
      console.error("[snapshot PATCH] error:", error);
      return NextResponse.json({ ok: false, error: "update failed" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: "not found or not yours" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, snapshot: data });
  } catch (err: any) {
    console.error("[snapshot PATCH] uncaught:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "internal error" },
      { status: 500 },
    );
  }
}
